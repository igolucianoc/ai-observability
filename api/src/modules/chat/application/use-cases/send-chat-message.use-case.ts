import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { EnvService } from '@/infra/env/env.service';
import { InferenceProvider } from '@/modules/insights/application/inference/inference-provider';
import { InferenceProviderError } from '@/modules/insights/application/inference/huggingface-inference.provider';
import { IngestTraceUseCase } from '@/modules/tracing/application/use-cases/ingest-trace.use-case';
import {
  type ErrorKind,
  type ExecutionStatus,
  type IngestTraceCommand,
} from '@/modules/tracing/domain/repositories/trace-ingestion.repository';

export interface SendChatMessageInput {
  userId: string;
  projectId: string;
  message: string;
  /// Modelo escolhido no seletor do chat. Opcional; cai no padrão do env.
  model?: string;
}

/// Lançado quando o modelo pedido não está na allowlist configurada (HF_MODELS).
export class UnsupportedModelError extends Error {
  constructor(model: string) {
    super(`Modelo não suportado: ${model}`);
    this.name = 'UnsupportedModelError';
  }
}

export interface ChatReply {
  traceId: string;
  status: ExecutionStatus;
  reply: string | null;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

/**
 * Envia uma mensagem do mini chat para o provedor de inferência (Hugging Face
 * ou mock) e registra a chamada como um trace observável, reaproveitando a
 * pipeline de ingestão. Toda chamada — sucesso, erro ou timeout — vira um trace,
 * de modo que o dashboard reflita o uso real de IA.
 */
@Injectable()
export class SendChatMessageUseCase extends BaseUseCase<SendChatMessageInput, ChatReply> {
  constructor(
    private readonly inference: InferenceProvider,
    private readonly ingestTrace: IngestTraceUseCase,
    private readonly env: EnvService,
  ) {
    super();
  }

  async execute(input: SendChatMessageInput): Promise<ChatReply> {
    const allowedModels = this.env.get('HF_MODELS');
    const model = input.model ?? this.env.get('HF_MODEL');
    if (!allowedModels.includes(model)) {
      throw new UnsupportedModelError(model);
    }
    const provider = this.inference.name;
    const promptTokens = estimateTokens(input.message);

    const startedAt = new Date();
    const start = Date.now();

    let reply: string | null = null;
    let status: ExecutionStatus = 'SUCCESS';
    let errorKind: ErrorKind | undefined;
    let errorMessage: string | undefined;
    let reportedPromptTokens: number | undefined;
    let reportedCompletionTokens: number | undefined;

    try {
      const result = await this.inference.generateResult({
        prompt: input.message,
        maxNewTokens: this.env.get('HF_MAX_NEW_TOKENS'),
        model,
      });
      reply = result.text;
      reportedPromptTokens = result.usage?.promptTokens;
      reportedCompletionTokens = result.usage?.completionTokens;
    } catch (error) {
      const isTimeout = error instanceof InferenceProviderError && /timed out/i.test(error.message);
      status = isTimeout ? 'TIMEOUT' : 'ERROR';
      errorKind = isTimeout ? 'TIMEOUT' : 'PROVIDER_ERROR';
      errorMessage =
        error instanceof Error ? error.message : 'Falha desconhecida na geração de texto';
    }

    const latencyMs = Date.now() - start;
    const endedAt = new Date(startedAt.getTime() + latencyMs);
    // Usa a contagem real do provedor quando disponível; senão, estima.
    const finalPromptTokens = reportedPromptTokens ?? promptTokens;
    const completionTokens = reportedCompletionTokens ?? (reply ? estimateTokens(reply) : 0);

    const command = this.buildTraceCommand({
      projectId: input.projectId,
      startedAt,
      endedAt,
      latencyMs,
      status,
      model,
      provider,
      message: input.message,
      reply,
      promptTokens: finalPromptTokens,
      completionTokens,
      errorKind,
      errorMessage,
    });

    const ingested = await this.ingestTrace.execute({ ownerId: input.userId, command });

    return {
      traceId: ingested.traceId,
      status,
      reply,
      model,
      provider,
      promptTokens: finalPromptTokens,
      completionTokens,
      latencyMs,
    };
  }

  private buildTraceCommand(params: {
    projectId: string;
    startedAt: Date;
    endedAt: Date;
    latencyMs: number;
    status: ExecutionStatus;
    model: string;
    provider: string;
    message: string;
    reply: string | null;
    promptTokens: number;
    completionTokens: number;
    errorKind?: ErrorKind;
    errorMessage?: string;
  }): IngestTraceCommand {
    const spanKey = 'llm-call';

    return {
      projectId: params.projectId,
      correlationId: randomUUID(),
      name: 'chat-completion',
      status: params.status,
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      metadata: { source: 'mini-chat' },
      spans: [
        {
          key: spanKey,
          name: 'llm-call',
          kind: 'LLM',
          status: params.status,
          startedAt: params.startedAt,
          endedAt: params.endedAt,
          llmCall: {
            provider: params.provider,
            model: params.model,
            latencyMs: params.latencyMs,
            requestText: params.message,
            responseText: params.reply ?? undefined,
            usage: {
              promptTokens: params.promptTokens,
              completionTokens: params.completionTokens,
            },
          },
          error:
            params.errorKind && params.errorMessage
              ? { kind: params.errorKind, message: params.errorMessage }
              : undefined,
        },
      ],
      errors:
        params.errorKind && params.errorMessage
          ? [{ kind: params.errorKind, message: params.errorMessage }]
          : [],
    };
  }
}

/**
 * Estimativa de tokens a partir do texto. O endpoint serverless de
 * text-generation do Hugging Face nem sempre retorna contagem de uso, então
 * aproximamos por ~4 caracteres por token (heurística comum). É uma estimativa,
 * não uma contagem exata do tokenizer do modelo.
 */
function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(normalized.length / 4));
}
