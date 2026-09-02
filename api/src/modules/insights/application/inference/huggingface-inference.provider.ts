import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EnvService } from '@/infra/env/env.service';
import {
  type InferenceRequest,
  type InferenceResult,
  InferenceProvider,
} from './inference-provider';

/// Resposta OpenAI-compatible do router de Inference Providers do Hugging Face.
/// É conteúdo não confiável; validamos o formato antes de usar.
const hfChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
    })
    .optional(),
});

export class InferenceProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InferenceProviderError';
  }
}

/**
 * Calls the Hugging Face Inference API for text generation. Bounded by a
 * timeout and a max-token cap; the response is validated, not trusted.
 */
@Injectable()
export class HuggingFaceInferenceProvider extends InferenceProvider {
  readonly name = 'huggingface';

  constructor(private readonly env: EnvService) {
    super();
  }

  async generateResult(request: InferenceRequest): Promise<InferenceResult> {
    const token = this.env.get('HF_API_TOKEN');
    if (!token) {
      throw new InferenceProviderError('Hugging Face token is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.get('HF_TIMEOUT_MS'));

    try {
      // Endpoint atual de Inference Providers do Hugging Face (OpenAI-compatible).
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model ?? this.env.get('HF_MODEL'),
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxNewTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new InferenceProviderError(`Hugging Face responded with ${response.status}`);
      }

      const json: unknown = await response.json();
      const parsed = hfChatResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new InferenceProviderError('Unexpected response shape from Hugging Face');
      }

      const text = parsed.data.choices[0]?.message.content?.trim();
      if (!text) {
        throw new InferenceProviderError('Empty generation from Hugging Face');
      }

      return {
        text,
        usage: parsed.data.usage
          ? {
              promptTokens: parsed.data.usage.prompt_tokens,
              completionTokens: parsed.data.usage.completion_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof InferenceProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new InferenceProviderError('Hugging Face request timed out');
      }
      throw new InferenceProviderError('Hugging Face request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
