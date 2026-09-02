import type { ReactElement } from 'react';
import type { StreamStatus } from '@/hooks/use-dashboard-stream';

const LABELS: Record<StreamStatus, { text: string; dot: string }> = {
  open: { text: 'Ao vivo', dot: 'bg-emerald-pulse' },
  connecting: { text: 'Conectando…', dot: 'bg-mint-glow' },
  closed: { text: 'Offline', dot: 'bg-graphite' },
};

/**
 * Small pill showing the real-time stream connection status.
 */
export function StreamIndicator({ status }: { status: StreamStatus }): ReactElement {
  const label = LABELS[status];
  return (
    <span className="inline-flex items-center gap-8 rounded-full border border-hairline px-16 py-8 text-caption text-forest-ink">
      <span className={`h-8 w-8 rounded-full ${label.dot}`} aria-hidden />
      {label.text}
    </span>
  );
}
