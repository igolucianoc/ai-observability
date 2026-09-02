import type { CSSProperties, ReactElement } from 'react';
import type { ProjectSummary } from '@/types/analytics';

export interface DashboardFilterValues {
  projectId: string;
  period: '24h' | '7d' | '30d' | 'all';
  status: '' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  model: string;
}

interface DashboardFiltersProps {
  projects: ProjectSummary[];
  models: string[];
  value: DashboardFilterValues;
  onChange: (next: DashboardFilterValues) => void;
}

// Select com aparência nativa removida e uma seta (chevron) customizada.
// A imagem/posição vão via `selectStyle` (CSS puro) para não depender do parser
// de classes arbitrárias do Tailwind com data-URI, que falhava silenciosamente.
const selectClass =
  'cursor-pointer appearance-none rounded-full border border-hairline bg-snow py-8 pl-16 pr-40 text-body text-forest-ink';

const selectStyle: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233f6b52' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
};

/**
 * Filter bar: project, period, status and model. Fully controlled.
 */
export function DashboardFilters({
  projects,
  models,
  value,
  onChange,
}: DashboardFiltersProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-16">
      <label className="flex items-center gap-8 text-caption text-graphite">
        Projeto
        <select
          className={selectClass}
          style={selectStyle}
          value={value.projectId}
          onChange={(e) => onChange({ ...value, projectId: e.target.value })}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-8 text-caption text-graphite">
        Período
        <select
          className={selectClass}
          style={selectStyle}
          value={value.period}
          onChange={(e) => onChange({ ...value, period: e.target.value as DashboardFilterValues['period'] })}
        >
          <option value="24h">Últimas 24h</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="all">Todo o período</option>
        </select>
      </label>

      <label className="flex items-center gap-8 text-caption text-graphite">
        Status
        <select
          className={selectClass}
          style={selectStyle}
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as DashboardFilterValues['status'] })}
        >
          <option value="">Todos</option>
          <option value="SUCCESS">Sucesso</option>
          <option value="ERROR">Erro</option>
          <option value="TIMEOUT">Timeout</option>
        </select>
      </label>

      <label className="flex items-center gap-8 text-caption text-graphite">
        Modelo
        <select
          className={selectClass}
          style={selectStyle}
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
        >
          <option value="">Todos</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/// Converts a period preset into an ISO `from` timestamp (or undefined for all).
export function periodToFrom(period: DashboardFilterValues['period']): string | undefined {
  if (period === 'all') {
    return undefined;
  }
  const now = Date.now();
  const hours = period === '24h' ? 24 : period === '7d' ? 24 * 7 : 24 * 30;
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}
