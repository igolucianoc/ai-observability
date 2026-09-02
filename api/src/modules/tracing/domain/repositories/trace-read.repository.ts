import { type ErrorKind, type ExecutionStatus, type SpanKind } from './trace-ingestion.repository';

export interface TraceListFilter {
  projectId: string;
  from?: Date;
  to?: Date;
  status?: ExecutionStatus;
  model?: string;
  page: number;
  pageSize: number;
}

export interface TraceListItem {
  id: string;
  name: string;
  correlationId: string;
  status: ExecutionStatus;
  startedAt: string;
  durationMs: number | null;
  totalTokens: number;
  totalCostUsd: string;
}

export interface TraceListResult {
  items: TraceListItem[];
  total: number;
}

export interface TraceDetailUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TraceDetailLlmCall {
  provider: string;
  model: string;
  temperature: number | null;
  latencyMs: number | null;
  costUsd: string;
  requestText: string | null;
  responseText: string | null;
  usage: TraceDetailUsage | null;
}

export interface TraceDetailSpan {
  id: string;
  parentSpanId: string | null;
  name: string;
  kind: SpanKind;
  status: ExecutionStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  llmCall: TraceDetailLlmCall | null;
}

export interface TraceDetailError {
  kind: ErrorKind;
  message: string;
  code: string | null;
  spanId: string | null;
}

export interface TraceDetail {
  id: string;
  projectId: string;
  name: string;
  correlationId: string;
  status: ExecutionStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  totalTokens: number;
  totalCostUsd: string;
  spans: TraceDetailSpan[];
  errors: TraceDetailError[];
}

/**
 * Read-only access to traces for the dashboard: a paginated list and a full
 * detail view. Ownership is enforced by the caller before these run.
 */
export abstract class TraceReadRepository {
  abstract findProjectOwner(projectId: string): Promise<string | null>;
  abstract list(filter: TraceListFilter): Promise<TraceListResult>;
  /// Returns the trace detail plus the owning project id (for ownership check).
  abstract findDetail(traceId: string): Promise<{ ownerId: string; detail: TraceDetail } | null>;
}
