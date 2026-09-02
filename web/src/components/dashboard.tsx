'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { api } from '@/lib/api';
import { formatCostUsd, formatDurationMs, formatNumber, formatPercent } from '@/lib/format';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useDashboardStream } from '@/hooks/use-dashboard-stream';
import type { AuthenticatedUser, ProjectSummary } from '@/types/analytics';
import {
  DashboardFilters,
  periodToFrom,
  type DashboardFilterValues,
} from './dashboard-filters';
import { KpiCard } from './kpi-card';
import { ModelBreakdown } from './model-breakdown';
import { StreamIndicator } from './stream-indicator';
import { TimeseriesChart } from './timeseries-chart';
import { TraceDetailPanel } from './trace-detail-panel';
import { TracesTable } from './traces-table';

interface DashboardProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactElement | ReactElement[];
}): ReactElement {
  return (
    <section
      className="flex flex-col gap-16 rounded-2xl border border-hairline bg-snow p-32"
      style={{ boxShadow: 'var(--shadow-subtle)' }}
    >
      <h2 className="font-[family-name:var(--font-inter-tight)] text-heading-sm font-semibold text-forest-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Dashboard({ user, onLogout }: DashboardProps): ReactElement {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [filters, setFilters] = useState<DashboardFilterValues>({
    projectId: '',
    period: '30d',
    status: '',
    model: '',
  });
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  useEffect(() => {
    api.listProjects().then((list) => {
      setProjects(list);
      setFilters((prev) => (prev.projectId ? prev : { ...prev, projectId: list[0]?.id ?? '' }));
    });
  }, []);

  const from = useMemo(() => periodToFrom(filters.period), [filters.period]);
  const projectId = filters.projectId || null;

  const data = useDashboardData({
    projectId,
    from,
    status: filters.status || undefined,
    model: filters.model || undefined,
  });

  const stream = useDashboardStream(projectId);

  // Refresh data when a new trace is ingested for the selected project.
  useEffect(() => {
    if (stream.lastEvent) {
      data.reload();
    }
    // Only react to a new event reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.lastEvent]);

  const modelOptions = data.models.map((m) => m.model);

  return (
    <div className="mx-auto flex max-w-[var(--page-max-width)] flex-col gap-32 px-24 py-40">
      <header className="flex flex-wrap items-center justify-between gap-16">
        <div className="flex items-center gap-16">
          <h1
            className="font-[family-name:var(--font-inter-tight)] text-heading font-semibold text-transparent bg-clip-text"
            style={{
              backgroundImage:
                'linear-gradient(105deg, var(--color-pine) 0%, var(--color-emerald-pulse) 40%, #a3a02f 100%)',
            }}
          >
            Observabilidade
          </h1>
          <StreamIndicator status={stream.status} />
        </div>
        <div className="flex items-center gap-16 text-caption text-graphite">
          <span>{user.email}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-hairline px-16 py-8 text-forest-ink hover:bg-paper"
          >
            Sair
          </button>
        </div>
      </header>

      <DashboardFilters
        projects={projects}
        models={modelOptions}
        value={filters}
        onChange={setFilters}
      />

      {data.error ? <p className="text-body text-signal-red">{data.error}</p> : null}

      <div className="grid grid-cols-2 gap-16 md:grid-cols-4">
        <KpiCard label="Requisições" value={formatNumber(data.overview?.totalRequests ?? 0)} />
        <KpiCard label="Custo total" value={formatCostUsd(data.overview?.totalCostUsd ?? '0')} />
        <KpiCard label="Tokens" value={formatNumber(data.overview?.totalTokens ?? 0)} />
        <KpiCard
          label="Taxa de erro"
          value={formatPercent(data.overview?.errorRate ?? 0)}
          hint={`p95 ${formatDurationMs(data.overview?.p95LatencyMs ?? null)}`}
        />
      </div>

      <Card title="Requisições ao longo do tempo">
        <TimeseriesChart points={data.timeseries} />
      </Card>

      <Card title="Custo por modelo">
        <ModelBreakdown items={data.models} />
      </Card>

      <Card title="Traces recentes">
        <TracesTable
          traces={data.traces?.items ?? []}
          selectedId={selectedTraceId}
          onSelect={setSelectedTraceId}
        />
      </Card>

      <TraceDetailPanel traceId={selectedTraceId} onClose={() => setSelectedTraceId(null)} />
    </div>
  );
}
