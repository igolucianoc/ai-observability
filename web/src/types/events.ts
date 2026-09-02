export interface TraceIngestedEvent {
  type: 'trace.ingested';
  projectId: string;
  traceId: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  totalTokens: number;
  totalCostUsd: string;
  at: string;
}

export type DashboardEvent = TraceIngestedEvent;
