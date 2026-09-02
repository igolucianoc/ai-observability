import { randomUUID } from 'node:crypto';
import {
  type TraceDetail,
  type TraceListFilter,
  type TraceListItem,
  type TraceListResult,
  TraceReadRepository,
} from '../../domain/repositories/trace-read.repository';

interface StoredProject {
  id: string;
  ownerId: string;
}

interface StoredTrace extends TraceListItem {
  projectId: string;
  detail: TraceDetail;
}

/**
 * In-memory trace read store for tests. Holds fully-formed list items and
 * details so E2E flows can exercise list/detail/ownership without a database.
 */
export class InMemoryTraceReadRepository extends TraceReadRepository {
  readonly projects: StoredProject[] = [];
  readonly traces: StoredTrace[] = [];

  findProjectOwner(projectId: string): Promise<string | null> {
    return Promise.resolve(this.projects.find((p) => p.id === projectId)?.ownerId ?? null);
  }

  list(filter: TraceListFilter): Promise<TraceListResult> {
    const matching = this.traces.filter((trace) => {
      if (trace.projectId !== filter.projectId) return false;
      if (filter.status && trace.status !== filter.status) return false;
      if (filter.from && new Date(trace.startedAt) < filter.from) return false;
      if (filter.to && new Date(trace.startedAt) > filter.to) return false;
      return true;
    });
    const start = (filter.page - 1) * filter.pageSize;
    const items = matching.slice(start, start + filter.pageSize).map((trace) => ({
      id: trace.id,
      name: trace.name,
      correlationId: trace.correlationId,
      status: trace.status,
      startedAt: trace.startedAt,
      durationMs: trace.durationMs,
      totalTokens: trace.totalTokens,
      totalCostUsd: trace.totalCostUsd,
    }));
    return Promise.resolve({ items, total: matching.length });
  }

  findDetail(traceId: string): Promise<{ ownerId: string; detail: TraceDetail } | null> {
    const trace = this.traces.find((t) => t.id === traceId);
    if (!trace) {
      return Promise.resolve(null);
    }
    const ownerId = this.projects.find((p) => p.id === trace.projectId)?.ownerId ?? '';
    return Promise.resolve({ ownerId, detail: trace.detail });
  }

  /// Test helper to add a trace with a minimal detail payload.
  seedTrace(projectId: string, overrides: Partial<TraceListItem> = {}): string {
    const id = overrides.id ?? randomUUID();
    const base: TraceListItem = {
      id,
      name: overrides.name ?? 'trace',
      correlationId: overrides.correlationId ?? 'corr',
      status: overrides.status ?? 'SUCCESS',
      startedAt: overrides.startedAt ?? new Date().toISOString(),
      durationMs: overrides.durationMs ?? 100,
      totalTokens: overrides.totalTokens ?? 0,
      totalCostUsd: overrides.totalCostUsd ?? '0.000000',
    };
    this.traces.push({
      ...base,
      projectId,
      detail: {
        ...base,
        projectId,
        endedAt: null,
        spans: [],
        errors: [],
      },
    });
    return id;
  }
}
