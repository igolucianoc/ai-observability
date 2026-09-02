import { Injectable } from '@nestjs/common';
import { type InferenceRequest, InferenceProvider } from './inference-provider';

/**
 * Deterministic offline provider used when no Hugging Face token is configured.
 * Lets the feature (and its tests) run without contacting an external service.
 */
@Injectable()
export class MockInferenceProvider extends InferenceProvider {
  readonly name = 'mock';

  generate(request: InferenceRequest): Promise<string> {
    const summary = request.prompt.slice(0, 200).replace(/\s+/g, ' ').trim();
    return Promise.resolve(
      `This trace likely failed due to a provider or timeout issue. ` +
        `Based on the observed signals (${summary}), review the model provider ` +
        `status and the request latency, then retry with a shorter prompt or a fallback model.`,
    );
  }
}
