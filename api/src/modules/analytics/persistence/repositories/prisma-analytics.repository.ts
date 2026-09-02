import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import {
  type AnalyticsFilter,
  AnalyticsRepository,
  type ModelBreakdownItem,
  type OverviewMetrics,
  type TimeseriesBucket,
  type TimeseriesPoint,
} from '../../domain/repositories/analytics.repository';

/// Builds the shared WHERE fragment for trace-level queries. All values are
/// passed as bound parameters, never interpolated, to prevent SQL injection.
function traceWhere(filter: AnalyticsFilter): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`t."projectId" = ${filter.projectId}`];
  if (filter.from) {
    conditions.push(Prisma.sql`t."startedAt" >= ${filter.from}`);
  }
  if (filter.to) {
    conditions.push(Prisma.sql`t."startedAt" <= ${filter.to}`);
  }
  if (filter.model) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM spans s JOIN llm_calls l ON l."spanId" = s.id WHERE s."traceId" = t.id AND l.model = ${filter.model})`,
    );
  }
  return Prisma.join(conditions, ' AND ');
}

interface OverviewRow {
  total_requests: bigint;
  total_tokens: bigint | null;
  total_cost: Prisma.Decimal | null;
  avg_latency: number | null;
  p95_latency: number | null;
  error_count: bigint;
}

interface ModelRow {
  model: string;
  requests: bigint;
  total_tokens: bigint | null;
  total_cost: Prisma.Decimal | null;
  avg_latency: number | null;
}

interface TimeseriesRow {
  bucket: Date;
  requests: bigint;
  total_tokens: bigint | null;
  total_cost: Prisma.Decimal | null;
  error_count: bigint;
}

@Injectable()
export class PrismaAnalyticsRepository extends AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProjectOwner(projectId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    return project?.ownerId ?? null;
  }

  async overview(filter: AnalyticsFilter): Promise<OverviewMetrics> {
    const rows = await this.prisma.$queryRaw<OverviewRow[]>`
      SELECT
        count(*)::bigint AS total_requests,
        sum(t."totalTokens")::bigint AS total_tokens,
        sum(t."totalCostUsd") AS total_cost,
        avg(t."durationMs") AS avg_latency,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY t."durationMs") AS p95_latency,
        count(*) FILTER (WHERE t.status <> 'SUCCESS')::bigint AS error_count
      FROM traces t
      WHERE ${traceWhere(filter)}
    `;

    const row = rows[0];
    const totalRequests = Number(row.total_requests);

    return {
      totalRequests,
      totalTokens: Number(row.total_tokens ?? 0),
      totalCostUsd: (row.total_cost ?? new Prisma.Decimal(0)).toFixed(6),
      avgLatencyMs: Math.round(row.avg_latency ?? 0),
      p95LatencyMs: Math.round(row.p95_latency ?? 0),
      errorRate: totalRequests ? Number((Number(row.error_count) / totalRequests).toFixed(4)) : 0,
    };
  }

  async byModel(filter: AnalyticsFilter): Promise<ModelBreakdownItem[]> {
    const rows = await this.prisma.$queryRaw<ModelRow[]>`
      SELECT
        l.model AS model,
        count(*)::bigint AS requests,
        sum(u."totalTokens")::bigint AS total_tokens,
        sum(l."costUsd") AS total_cost,
        avg(l."latencyMs") AS avg_latency
      FROM traces t
      JOIN spans s ON s."traceId" = t.id
      JOIN llm_calls l ON l."spanId" = s.id
      LEFT JOIN usage u ON u."llmCallId" = l.id
      WHERE ${traceWhere(filter)}
      GROUP BY l.model
      ORDER BY total_cost DESC NULLS LAST
    `;

    return rows.map((row) => ({
      model: row.model,
      requests: Number(row.requests),
      totalTokens: Number(row.total_tokens ?? 0),
      totalCostUsd: (row.total_cost ?? new Prisma.Decimal(0)).toFixed(6),
      avgLatencyMs: Math.round(row.avg_latency ?? 0),
    }));
  }

  async timeseries(filter: AnalyticsFilter, bucket: TimeseriesBucket): Promise<TimeseriesPoint[]> {
    // `bucket` is a validated enum ('day' | 'hour'), safe to embed as a literal.
    const truncUnit = bucket === 'hour' ? 'hour' : 'day';
    const rows = await this.prisma.$queryRaw<TimeseriesRow[]>`
      SELECT
        date_trunc(${truncUnit}, t."startedAt") AS bucket,
        count(*)::bigint AS requests,
        sum(t."totalTokens")::bigint AS total_tokens,
        sum(t."totalCostUsd") AS total_cost,
        count(*) FILTER (WHERE t.status <> 'SUCCESS')::bigint AS error_count
      FROM traces t
      WHERE ${traceWhere(filter)}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((row) => ({
      bucket: row.bucket.toISOString(),
      requests: Number(row.requests),
      totalTokens: Number(row.total_tokens ?? 0),
      totalCostUsd: (row.total_cost ?? new Prisma.Decimal(0)).toFixed(6),
      errorCount: Number(row.error_count),
    }));
  }
}
