import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import {
  ProjectAccessDeniedError,
  ProjectNotFoundError,
} from '@/modules/tracing/domain/errors/tracing.errors';
import {
  type TraceDetail,
  TraceReadRepository,
} from '@/modules/tracing/domain/repositories/trace-read.repository';
import { EnvService } from '@/infra/env/env.service';
import { InferenceProvider } from '../inference/inference-provider';

export interface ExplainTraceInput {
  userId: string;
  traceId: string;
}

export interface TraceExplanation {
  traceId: string;
  explanation: string;
  provider: string;
}

/**
 * Produces a natural-language explanation of a trace's outcome using the
 * configured inference provider. Ownership is enforced, and only non-sensitive,
 * structural signals are sent to the model — never prompts, responses, or PII.
 */
@Injectable()
export class ExplainTraceUseCase extends BaseUseCase<ExplainTraceInput, TraceExplanation> {
  constructor(
    private readonly traces: TraceReadRepository,
    private readonly inference: InferenceProvider,
    private readonly env: EnvService,
  ) {
    super();
  }

  async execute(input: ExplainTraceInput): Promise<TraceExplanation> {
    const found = await this.traces.findDetail(input.traceId);
    if (found === null) {
      throw new ProjectNotFoundError();
    }
    if (found.ownerId !== input.userId) {
      throw new ProjectAccessDeniedError();
    }

    const prompt = this.buildPrompt(found.detail);
    const explanation = await this.inference.generate({
      prompt,
      maxNewTokens: this.env.get('HF_MAX_NEW_TOKENS'),
    });

    return { traceId: input.traceId, explanation, provider: this.inference.name };
  }

  /// Builds a prompt from structural signals only. Request/response text and
  /// any free-form metadata are intentionally excluded to avoid leaking PII.
  private buildPrompt(trace: TraceDetail): string {
    const models = trace.spans
      .map((span) => span.llmCall?.model)
      .filter((model): model is string => Boolean(model));
    const errorKinds = trace.errors.map((error) => error.kind);

    const facts = [
      `status: ${trace.status}`,
      `duration_ms: ${trace.durationMs ?? 'unknown'}`,
      `total_tokens: ${trace.totalTokens}`,
      `models: ${models.length ? models.join(', ') : 'none'}`,
      `error_kinds: ${errorKinds.length ? errorKinds.join(', ') : 'none'}`,
      `span_count: ${trace.spans.length}`,
    ].join('; ');

    return (
      'Você é um assistente de observabilidade. Responda em português do Brasil. ' +
      'Em 2 a 3 frases, explique a provável causa do resultado do trace de IA a seguir ' +
      'e sugira um próximo passo. Não invente detalhes além dos sinais fornecidos. ' +
      `Sinais: ${facts}.`
    );
  }
}
