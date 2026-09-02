import type { ReactElement } from 'react';
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

const selectClass =
  'rounded-full border border-hairline bg-snow px-16 py-8 text-body text-forest-ink';

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
