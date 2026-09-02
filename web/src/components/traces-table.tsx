import type { ReactElement } from 'react';
import { formatCostUsd, formatDateTime, formatDurationMs, formatNumber } from '@/lib/format';
import type { TraceListItem } from '@/types/analytics';
import { StatusBadge } from './status-badge';

interface TracesTableProps {
  traces: TraceListItem[];
  selectedId: string | null;
  onSelect: (traceId: string) => void;
}

/**
 * Table of recent traces. A row is a button so it is keyboard-accessible.
 */
export function TracesTable({ traces, selectedId, onSelect }: TracesTableProps): ReactElement {
  if (traces.length === 0) {
    return <p className="py-32 text-center text-body text-graphite">No traces match the filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body">
        <thead>
          <tr className="border-b border-hairline text-left text-caption uppercase text-graphite">
            <th className="py-8 pr-16 font-medium">Trace</th>
            <th className="py-8 pr-16 font-medium">Status</th>
            <th className="py-8 pr-16 font-medium">Started</th>
            <th className="py-8 pr-16 text-right font-medium">Duration</th>
            <th className="py-8 pr-16 text-right font-medium">Tokens</th>
            <th className="py-8 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((trace) => (
            <tr
              key={trace.id}
              className={`cursor-pointer border-b border-hairline transition-colors hover:bg-paper ${
                selectedId === trace.id ? 'bg-mint-mist' : ''
              }`}
              onClick={() => onSelect(trace.id)}
            >
              <td className="py-8 pr-16">
                <button
                  type="button"
                  className="text-left font-medium text-forest-ink"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(trace.id);
                  }}
                >
                  {trace.name}
                </button>
              </td>
              <td className="py-8 pr-16">
                <StatusBadge status={trace.status} />
              </td>
              <td className="py-8 pr-16 text-graphite">{formatDateTime(trace.startedAt)}</td>
              <td className="py-8 pr-16 text-right text-graphite">
                {formatDurationMs(trace.durationMs)}
              </td>
              <td className="py-8 pr-16 text-right text-graphite">
                {formatNumber(trace.totalTokens)}
              </td>
              <td className="py-8 text-right font-medium text-forest-ink">
                {formatCostUsd(trace.totalCostUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
