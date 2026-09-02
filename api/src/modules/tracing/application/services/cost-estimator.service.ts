import { Injectable } from '@nestjs/common';

interface ModelPrice {
  promptPerM: number;
  completionPerM: number;
}

/// Illustrative USD price per 1M tokens. Unknown models fall back to a default.
const MODEL_PRICING: Record<string, ModelPrice> = {
  'gpt-4o': { promptPerM: 2.5, completionPerM: 10 },
  'gpt-4o-mini': { promptPerM: 0.15, completionPerM: 0.6 },
  'claude-3-5-sonnet': { promptPerM: 3, completionPerM: 15 },
  'gemini-1.5-pro': { promptPerM: 1.25, completionPerM: 5 },
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
