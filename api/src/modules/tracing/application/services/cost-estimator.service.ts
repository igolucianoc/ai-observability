import { Injectable } from '@nestjs/common';

interface ModelPrice {
  promptPerM: number;
  completionPerM: number;
}

/// Illustrative USD price per 1M tokens. Unknown models fall back to a default.
/// Hugging Face serverless inference is effectively free per token; its price is
/// kept low and purely illustrative so cost aggregations remain meaningful.
const MODEL_PRICING: Record<string, ModelPrice> = {
  'gpt-4o': { promptPerM: 2.5, completionPerM: 10 },
  'gpt-4o-mini': { promptPerM: 0.15, completionPerM: 0.6 },
  'claude-3-5-sonnet': { promptPerM: 3, completionPerM: 15 },
  'gemini-1.5-pro': { promptPerM: 1.25, completionPerM: 5 },
  'meta-llama/Llama-3.1-8B-Instruct': { promptPerM: 0.06, completionPerM: 0.12 },
  'meta-llama/Llama-3.3-70B-Instruct': { promptPerM: 0.35, completionPerM: 0.4 },
  'deepseek-ai/DeepSeek-V3-0324': { promptPerM: 0.9, completionPerM: 0.9 },
  'Qwen/Qwen2.5-7B-Instruct': { promptPerM: 0.05, completionPerM: 0.1 },
  'mistralai/Mistral-7B-Instruct-v0.3': { promptPerM: 0.05, completionPerM: 0.1 },
  'HuggingFaceH4/zephyr-7b-beta': { promptPerM: 0.05, completionPerM: 0.1 },
};

const DEFAULT_PRICE: ModelPrice = { promptPerM: 1, completionPerM: 2 };

/**
 * Estimates the USD cost of an LLM call from its token usage. Server-side only,
 * so clients cannot inflate or under-report cost figures used in aggregations.
 */
@Injectable()
export class CostEstimatorService {
  estimate(model: string, promptTokens: number, completionTokens: number): number {
    const price = MODEL_PRICING[model] ?? DEFAULT_PRICE;
    const cost =
      (promptTokens / 1_000_000) * price.promptPerM +
      (completionTokens / 1_000_000) * price.completionPerM;
    return Number(cost.toFixed(6));
  }
}
