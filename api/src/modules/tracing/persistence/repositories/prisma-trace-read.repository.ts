import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import {
  type TraceDetail,
  type TraceListFilter,
  type TraceListResult,
  TraceReadRepository,
} from '../../domain/repositories/trace-read.repository';

@Injectable()
export class PrismaTraceReadRepository extends TraceReadRepository {
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

  async list(filter: TraceListFilter): Promise<TraceListResult> {
    const where: Prisma.TraceWhereInput = {
      projectId: filter.projectId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.from || filter.to
        ? {
            startedAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
      ...(filter.model ? { spans: { some: { llmCall: { model: filter.model } } } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trace.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        select: {
          id: true,
          name: true,
          correlationId: true,
          status: true,
          startedAt: true,
          durationMs: true,
          totalTokens: true,
          totalCostUsd: true,
        },
      }),
      this.prisma.trace.count({ where }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        correlationId: row.correlationId,
        status: row.status,
        startedAt: row.startedAt.toISOString(),
        durationMs: row.durationMs,
        totalTokens: row.totalTokens,
        totalCostUsd: row.totalCostUsd.toFixed(6),
      })),
    };
  }

  async findDetail(traceId: string): Promise<{ ownerId: string; detail: TraceDetail } | null> {
    const trace = await this.prisma.trace.findUnique({
      where: { id: traceId },
      include: {
        project: { select: { ownerId: true } },
        spans: {
          orderBy: { startedAt: 'asc' },
          include: { llmCall: { include: { usage: true } } },
        },
        errors: true,
      },
    });

    if (!trace) {
      return null;
    }

    const detail: TraceDetail = {
      id: trace.id,
      projectId: trace.projectId,
      name: trace.name,
      correlationId: trace.correlationId,
      status: trace.status,
      startedAt: trace.startedAt.toISOString(),
      endedAt: trace.endedAt ? trace.endedAt.toISOString() : null,
      durationMs: trace.durationMs,
      totalTokens: trace.totalTokens,
      totalCostUsd: trace.totalCostUsd.toFixed(6),
      spans: trace.spans.map((span) => ({
        id: span.id,
        parentSpanId: span.parentSpanId,
        name: span.name,
        kind: span.kind,
        status: span.status,
        startedAt: span.startedAt.toISOString(),
        endedAt: span.endedAt ? span.endedAt.toISOString() : null,
        durationMs: span.durationMs,
        llmCall: span.llmCall
          ? {
              provider: span.llmCall.provider,
              model: span.llmCall.model,
              temperature: span.llmCall.temperature,
              latencyMs: span.llmCall.latencyMs,
              costUsd: span.llmCall.costUsd.toFixed(6),
              requestText: span.llmCall.requestText,
              responseText: span.llmCall.responseText,
              usage: span.llmCall.usage
                ? {
                    promptTokens: span.llmCall.usage.promptTokens,
                    completionTokens: span.llmCall.usage.completionTokens,
                    totalTokens: span.llmCall.usage.totalTokens,
                  }
                : null,
            }
          : null,
      })),
      errors: trace.errors.map((error) => ({
        kind: error.kind,
        message: error.message,
        code: error.code,
        spanId: error.spanId,
      })),
    };

    return { ownerId: trace.project.ownerId, detail };
  }
}
