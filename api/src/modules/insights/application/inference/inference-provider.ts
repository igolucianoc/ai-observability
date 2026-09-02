export interface InferenceRequest {
  prompt: string;
  maxNewTokens: number;
}

/**
 * Abstraction over a text-generation provider. Implementations must treat the
 * returned text as untrusted output (never eval/SQL/HTML) and callers likewise.
 */
export abstract class InferenceProvider {
  abstract generate(request: InferenceRequest): Promise<string>;
  /// Identifies the active backend, surfaced in responses for transparency.
  abstract readonly name: string;
}
