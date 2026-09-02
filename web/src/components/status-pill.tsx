import type { ReactElement } from 'react';

interface StatusPillProps {
  label: string;
}

/**
 * Pill-shaped status indicator following the design system: fully rounded,
 * mint-mist background, hairline border, forest-ink text.
 */
export function StatusPill({ label }: StatusPillProps): ReactElement {
  return (
    <span
      className="inline-flex items-center gap-8 rounded-full border border-hairline bg-mint-mist px-16 py-8 text-caption font-medium text-forest-ink"
      style={{ boxShadow: 'var(--shadow-subtle)' }}
    >
      <span aria-hidden className="h-8 w-8 rounded-full bg-emerald-pulse" />
      {label}
    </span>
  );
}
