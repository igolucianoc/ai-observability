export type ExecutionStatus = 'SUCCESS' | 'ERROR' | 'TIMEOUT';
export type SpanKind = 'LLM' | 'RETRIEVAL' | 'TOOL' | 'EMBEDDING' | 'CHAIN';
export type ErrorKind = 'PROVIDER_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'VALIDATION' | 'INTERNAL';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface OverviewMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
}

export interface ModelBreakdownItem {
  model: string;
  requests: number;
  totalTokens: number;
  totalCostUsd: string;
  avgLatencyMs: number;
}

export interface TimeseriesPoint {
  bucket: string;
  requests: number;
  totalTokens: number;
  totalCostUsd: string;
  errorCount: number;
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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TraceListPage {
  items: TraceListItem[];
  meta: PaginationMeta;
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

export interface TraceExplanation {
  traceId: string;
  explanation: string;
  provider: string;
}
