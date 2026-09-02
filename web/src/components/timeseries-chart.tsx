import type { ReactElement } from 'react';
import type { TimeseriesPoint } from '@/types/analytics';

interface TimeseriesChartProps {
  points: TimeseriesPoint[];
}

const WIDTH = 720;
const HEIGHT = 200;
const PADDING = 24;

/**
 * Lightweight inline SVG bar chart of requests per time bucket, with the error
 * portion of each bar highlighted. Avoids pulling in a charting dependency.
 */
export function TimeseriesChart({ points }: TimeseriesChartProps): ReactElement {
  if (points.length === 0) {
    return <p className="py-32 text-center text-body text-graphite">Sem dados para este período.</p>;
  }

  const maxRequests = Math.max(...points.map((p) => p.requests), 1);
  const usableWidth = WIDTH - PADDING * 2;
  const usableHeight = HEIGHT - PADDING * 2;
  const barSlot = usableWidth / points.length;
  const barWidth = Math.max(2, barSlot * 0.6);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Requisições ao longo do tempo"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="var(--color-hairline)"
        strokeWidth={1}
      />
      {points.map((point, index) => {
        const totalHeight = (point.requests / maxRequests) * usableHeight;
        const errorHeight = point.requests
          ? (point.errorCount / point.requests) * totalHeight
          : 0;
        const successHeight = totalHeight - errorHeight;
        const x = PADDING + index * barSlot + (barSlot - barWidth) / 2;
        const baseY = HEIGHT - PADDING;

        return (
          <g key={point.bucket}>
            <rect
              x={x}
              y={baseY - successHeight}
              width={barWidth}
              height={successHeight}
              fill="var(--color-emerald-pulse)"
              rx={2}
            >
              <title>{`${point.bucket}: ${point.requests} requisições`}</title>
            </rect>
            {errorHeight > 0 ? (
              <rect
                x={x}
                y={baseY - totalHeight}
                width={barWidth}
                height={errorHeight}
                fill="var(--color-signal-red)"
                rx={2}
              >
                <title>{`${point.bucket}: ${point.errorCount} erros`}</title>
              </rect>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
