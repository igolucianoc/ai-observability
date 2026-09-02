import type { ReactElement } from 'react';
import { formatCostUsd, formatDurationMs, formatNumber } from '@/lib/format';
import type { ModelBreakdownItem } from '@/types/analytics';

/**
 * Per-model usage table ordered by cost, as returned by the API.
 */
export function ModelBreakdown({ items }: { items: ModelBreakdownItem[] }): ReactElement {
  if (items.length === 0) {
    return <p className="py-24 text-center text-body text-graphite">No model activity yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {items.map((item) => (
        <div
          key={item.model}
          className="flex items-center justify-between border-b border-hairline py-8 last:border-b-0"
        >
          <span className="font-[family-name:var(--font-ui-monospace)] text-body text-forest-ink">
            {item.model}
          </span>
          <div className="flex gap-24 text-caption text-graphite">
            <span>{formatNumber(item.requests)} req</span>
            <span>{formatNumber(item.totalTokens)} tok</span>
            <span>{formatDurationMs(item.avgLatencyMs)}</span>
            <span className="w-64 text-right font-medium text-forest-ink">
              {formatCostUsd(item.totalCostUsd)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
