export type ExecutionStatus = 'SUCCESS' | 'ERROR' | 'TIMEOUT';
export type SpanKind = 'LLM' | 'RETRIEVAL' | 'TOOL' | 'EMBEDDING' | 'CHAIN';
export type ErrorKind = 'PROVIDER_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'VALIDATION' | 'INTERNAL';

export interface UsageCommand {
  promptTokens: number;
  completionTokens: number;
}

export interface LlmCallCommand {
  provider: string;
  model: string;
  temperature?: number;
  latencyMs?: number;
  requestText?: string;
  responseText?: string;
  usage?: UsageCommand;
}

export interface SpanErrorCommand {
  kind: ErrorKind;
  message: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

export interface SpanCommand {
  key: string;
  parentKey?: string;
  name: string;
  kind: SpanKind;
  status: ExecutionStatus;
  startedAt: Date;
  endedAt?: Date;
  metadata?: Record<string, unknown>;
  llmCall?: LlmCallCommand;
  error?: SpanErrorCommand;
}

export interface TraceErrorCommand {
  kind: ErrorKind;
  message: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

/**
 * A fully validated trace ready to be persisted. Costs and rollups are computed
 * by the repository, not supplied by the client.
 */
export interface IngestTraceCommand {
  projectId: string;
  correlationId: string;
  name: string;
  status: ExecutionStatus;
  startedAt: Date;
  endedAt?: Date;
  metadata?: Record<string, unknown>;
  spans: SpanCommand[];
  errors: TraceErrorCommand[];
}

export interface IngestedTrace {
  traceId: string;
  spanCount: number;
  totalTokens: number;
  totalCostUsd: string;
}

/**
 * Persistence contract for ingesting a complete trace as a single unit.
 */
export abstract class TraceIngestionRepository {
  /// Returns the owner id of a project, or null if it does not exist.
  abstract findProjectOwner(projectId: string): Promise<string | null>;

  /// Persists the whole trace atomically and returns a summary.
  abstract ingest(command: IngestTraceCommand): Promise<IngestedTrace>;
}
