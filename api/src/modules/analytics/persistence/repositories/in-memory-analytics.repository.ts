import {
  type AnalyticsFilter,
  AnalyticsRepository,
  type ModelBreakdownItem,
  type OverviewMetrics,
  type TimeseriesBucket,
  type TimeseriesPoint,
} from '../../domain/repositories/analytics.repository';

export interface InMemoryTrace {
  projectId: string;
  startedAt: Date;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  durationMs: number;
  totalTokens: number;
  totalCostUsd: number;
  /// Models used by this trace's LLM calls (for the `model` filter/breakdown).
  calls: Array<{ model: string; tokens: number; costUsd: number; latencyMs: number }>;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.min(Math.max(index, 0), sortedValues.length - 1)];
}

/**
 * In-memory analytics over an array of traces, mirroring the Prisma
 * implementation's aggregation semantics for unit tests.
 */
export class InMemoryAnalyticsRepository extends AnalyticsRepository {
  readonly projects: Array<{ id: string; ownerId: string }> = [];
  readonly traces: InMemoryTrace[] = [];

  findProjectOwner(projectId: string): Promise<string | null> {
    return Promise.resolve(this.projects.find((p) => p.id === projectId)?.ownerId ?? null);
  }

  deleteAllForUser(userId: string): Promise<number> {
    const ownedProjectIds = new Set(
      this.projects.filter((p) => p.ownerId === userId).map((p) => p.id),
    );
    let deleted = 0;
    for (let i = this.traces.length - 1; i >= 0; i -= 1) {
      if (ownedProjectIds.has(this.traces[i].projectId)) {
        this.traces.splice(i, 1);
        deleted += 1;
      }
    }
    return Promise.resolve(deleted);
  }

  private select(filter: AnalyticsFilter): InMemoryTrace[] {
    return this.traces.filter((trace) => {
      if (trace.projectId !== filter.projectId) return false;
      if (filter.from && trace.startedAt < filter.from) return false;
      if (filter.to && trace.startedAt > filter.to) return false;
      if (filter.model && !trace.calls.some((call) => call.model === filter.model)) return false;
      return true;
    });
  }

  overview(filter: AnalyticsFilter): Promise<OverviewMetrics> {
    const traces = this.select(filter);
    const totalRequests = traces.length;
    const totalTokens = traces.reduce((sum, t) => sum + t.totalTokens, 0);
    const totalCostUsd = traces.reduce((sum, t) => sum + t.totalCostUsd, 0);
    const latencies = traces.map((t) => t.durationMs).sort((a, b) => a - b);
    const avgLatencyMs = totalRequests
      ? Math.round(latencies.reduce((sum, v) => sum + v, 0) / totalRequests)
      : 0;
    const errors = traces.filter((t) => t.status !== 'SUCCESS').length;

    return Promise.resolve({
      totalRequests,
      totalTokens,
      totalCostUsd: totalCostUsd.toFixed(6),
      avgLatencyMs,
      p95LatencyMs: percentile(latencies, 95),
      errorRate: totalRequests ? Number((errors / totalRequests).toFixed(4)) : 0,
    });
  }

  byModel(filter: AnalyticsFilter): Promise<ModelBreakdownItem[]> {
    const buckets = new Map<
      string,
      { requests: number; tokens: number; cost: number; latencySum: number }
    >();

    for (const trace of this.select(filter)) {
      for (const call of trace.calls) {
        if (filter.model && call.model !== filter.model) continue;
        const entry = buckets.get(call.model) ?? {
          requests: 0,
          tokens: 0,
          cost: 0,
          latencySum: 0,
        };
        entry.requests += 1;
        entry.tokens += call.tokens;
        entry.cost += call.costUsd;
        entry.latencySum += call.latencyMs;
        buckets.set(call.model, entry);
      }
    }

    const items = [...buckets.entries()]
      .map(([model, e]) => ({
        model,
        requests: e.requests,
        totalTokens: e.tokens,
        totalCostUsd: e.cost.toFixed(6),
        avgLatencyMs: e.requests ? Math.round(e.latencySum / e.requests) : 0,
      }))
      .sort((a, b) => Number(b.totalCostUsd) - Number(a.totalCostUsd));

    return Promise.resolve(items);
  }

  timeseries(filter: AnalyticsFilter, bucket: TimeseriesBucket): Promise<TimeseriesPoint[]> {
    const buckets = new Map<
      string,
      { requests: number; tokens: number; cost: number; errors: number }
    >();

    for (const trace of this.select(filter)) {
      const key = this.bucketKey(trace.startedAt, bucket);
      const entry = buckets.get(key) ?? { requests: 0, tokens: 0, cost: 0, errors: 0 };
      entry.requests += 1;
      entry.tokens += trace.totalTokens;
      entry.cost += trace.totalCostUsd;
      if (trace.status !== 'SUCCESS') entry.errors += 1;
      buckets.set(key, entry);
    }

    const points = [...buckets.entries()]
      .map(([bucketKey, e]) => ({
        bucket: bucketKey,
        requests: e.requests,
        totalTokens: e.tokens,
        totalCostUsd: e.cost.toFixed(6),
        errorCount: e.errors,
      }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));

    return Promise.resolve(points);
  }

  private bucketKey(date: Date, bucket: TimeseriesBucket): string {
    const iso = date.toISOString();
    return bucket === 'hour' ? `${iso.slice(0, 13)}:00:00Z` : iso.slice(0, 10);
  }
}
