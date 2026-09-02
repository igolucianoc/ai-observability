import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EnvService } from '@/infra/env/env.service';
import { type InferenceRequest, InferenceProvider } from './inference-provider';

/// The provider's response is untrusted; validate its shape before use.
const hfResponseSchema = z.union([
  z.array(z.object({ generated_text: z.string() })),
  z.object({ generated_text: z.string() }),
]);

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

  async generate(request: InferenceRequest): Promise<string> {
    const token = this.env.get('HF_API_TOKEN');
    if (!token) {
      throw new InferenceProviderError('Hugging Face token is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.get('HF_TIMEOUT_MS'));

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.env.get('HF_MODEL')}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: request.prompt,
            parameters: { max_new_tokens: request.maxNewTokens, return_full_text: false },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new InferenceProviderError(`Hugging Face responded with ${response.status}`);
      }

      const json: unknown = await response.json();
      const parsed = hfResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new InferenceProviderError('Unexpected response shape from Hugging Face');
      }

      const text = Array.isArray(parsed.data)
        ? parsed.data[0]?.generated_text
        : parsed.data.generated_text;
      if (!text) {
        throw new InferenceProviderError('Empty generation from Hugging Face');
      }
      return text.trim();
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
