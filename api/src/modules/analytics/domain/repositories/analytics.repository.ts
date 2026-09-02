export interface AnalyticsFilter {
  projectId: string;
  from?: Date;
  to?: Date;
  model?: string;
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

export type TimeseriesBucket = 'day' | 'hour';

/**
 * Read-only aggregation contract for dashboards. All methods are scoped by the
 * provided filter, which always pins a single project.
 */
export abstract class AnalyticsRepository {
  abstract findProjectOwner(projectId: string): Promise<string | null>;
  abstract overview(filter: AnalyticsFilter): Promise<OverviewMetrics>;
  abstract byModel(filter: AnalyticsFilter): Promise<ModelBreakdownItem[]>;
  abstract timeseries(
    filter: AnalyticsFilter,
    bucket: TimeseriesBucket,
  ): Promise<TimeseriesPoint[]>;
  /// Remove todos os traces (e cascata: spans, chamadas, uso, erros) dos
  /// projetos do usuário. Os projetos em si são preservados. Retorna a
  /// quantidade de traces removidos.
  abstract deleteAllForUser(userId: string): Promise<number>;
}
