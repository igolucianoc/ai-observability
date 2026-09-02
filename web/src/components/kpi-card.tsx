import type { ReactElement, ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

/**
 * A single metric tile: white card, hairline border, forest-ink value.
 * Follows the flat, shadow-light design system.
 */
export function KpiCard({ label, value, hint }: KpiCardProps): ReactElement {
  return (
    <div
      className="flex flex-col gap-8 rounded-2xl border border-hairline bg-snow p-24"
      style={{ boxShadow: 'var(--shadow-subtle)' }}
    >
      <span className="text-caption font-medium uppercase tracking-wide text-graphite">
        {label}
      </span>
      <span className="font-[family-name:var(--font-inter-tight)] text-heading font-semibold text-forest-ink">
        {value}
      </span>
      {hint ? <span className="text-caption text-graphite">{hint}</span> : null}
    </div>
  );
}
