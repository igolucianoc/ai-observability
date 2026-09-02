/// Formatting helpers for dashboard values. Pure and side-effect free.

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatCostUsd(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  // Custos de inferência podem ser frações de centavo. Usamos sempre 6 casas
  // decimais para uma exibição consistente em todo o dashboard.
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(num);
}

export function formatDurationMs(ms: number | null): string {
  if (ms === null) {
    return '—';
  }
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
