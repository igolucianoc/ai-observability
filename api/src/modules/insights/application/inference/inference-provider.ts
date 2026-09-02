export interface InferenceRequest {
  prompt: string;
  maxNewTokens: number;
  /// Modelo a usar nesta chamada. Quando ausente, o provedor usa o padrão do env.
  model?: string;
}

/**
 * Resultado de uma geração. `usage` traz a contagem real de tokens quando o
 * provedor a informa; quando ausente, o chamador pode estimar.
 */
export interface InferenceResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Abstraction over a text-generation provider. Implementations must treat the
 * returned text as untrusted output (never eval/SQL/HTML) and callers likewise.
 */
export abstract class InferenceProvider {
  /// Gera texto e retorna o resultado completo (texto + uso quando disponível).
  abstract generateResult(request: InferenceRequest): Promise<InferenceResult>;

  /// Conveniência: retorna apenas o texto gerado.
  async generate(request: InferenceRequest): Promise<string> {
    const result = await this.generateResult(request);
    return result.text;
  }

  /// Identifies the active backend, surfaced in responses for transparency.
  abstract readonly name: string;
}
