import type { ReactElement } from 'react';
import type { ExecutionStatus } from '@/types/analytics';

const STYLES: Record<ExecutionStatus, { bg: string; text: string; label: string }> = {
  SUCCESS: { bg: 'bg-mint-mist', text: 'text-pine', label: 'Sucesso' },
  ERROR: { bg: 'bg-[#fde8e8]', text: 'text-signal-red', label: 'Erro' },
  TIMEOUT: { bg: 'bg-paper', text: 'text-graphite', label: 'Timeout' },
};

/**
 * Pill badge conveying a trace/span execution status.
 */
export function StatusBadge({ status }: { status: ExecutionStatus }): ReactElement {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-16 py-8 text-caption font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
