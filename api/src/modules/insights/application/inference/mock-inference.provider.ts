import { Injectable } from '@nestjs/common';
import {
  type InferenceRequest,
  type InferenceResult,
  InferenceProvider,
} from './inference-provider';

/**
 * Deterministic offline provider used when no Hugging Face token is configured.
 * Lets the feature (and its tests) run without contacting an external service.
 */
@Injectable()
export class MockInferenceProvider extends InferenceProvider {
  readonly name = 'mock';

  generateResult(request: InferenceRequest): Promise<InferenceResult> {
    const summary = request.prompt.slice(0, 200).replace(/\s+/g, ' ').trim();
    const text =
      `Este trace provavelmente falhou por um problema no provedor ou por timeout. ` +
      `Com base nos sinais observados (${summary}), verifique o status do provedor ` +
      `do modelo e a latência da requisição e, então, tente novamente com um prompt ` +
      `mais curto ou um modelo de fallback.`;
    return Promise.resolve({ text });
  }
}
