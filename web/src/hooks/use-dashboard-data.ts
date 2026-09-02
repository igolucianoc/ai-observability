'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type AnalyticsFilterParams, type TraceListParams } from '@/lib/api';
import type {
  ModelBreakdownItem,
  OverviewMetrics,
  TimeseriesPoint,
  TraceListPage,
} from '@/types/analytics';

export interface DashboardData {
  overview: OverviewMetrics | null;
  models: ModelBreakdownItem[];
  timeseries: TimeseriesPoint[];
  traces: TraceListPage | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export interface DashboardParams {
  projectId: string | null;
  from?: string;
  status?: string;
  model?: string;
}

/**
 * Loads overview, model breakdown, timeseries and the trace list for the given
 * filters. Exposes `reload` so callers can refresh on SSE events.
 */
export function useDashboardData(params: DashboardParams): DashboardData {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [models, setModels] = useState<ModelBreakdownItem[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [traces, setTraces] = useState<TraceListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const { projectId, from, status, model } = params;

  useEffect(() => {
    if (!projectId) {
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    const analyticsParams: AnalyticsFilterParams = { projectId, from, model };
    const traceParams: TraceListParams = { projectId, from, model, status, page: 1, pageSize: 20 };

    Promise.all([
      api.overview(analyticsParams),
      api.models(analyticsParams),
      api.timeseries({ ...analyticsParams, bucket: 'day' }),
      api.listTraces(traceParams),
    ])
      .then(([ov, md, ts, tr]) => {
        if (!active) {
          return;
        }
        setOverview(ov);
        setModels(md);
        setTimeseries(ts);
        setTraces(tr);
      })
      .catch(() => {
        if (active) {
          setError('Failed to load dashboard data.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, from, status, model, nonce]);

  return { overview, models, timeseries, traces, loading, error, reload };
}
