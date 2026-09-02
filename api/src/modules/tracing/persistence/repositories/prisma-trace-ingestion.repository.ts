import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { CostEstimatorService } from '../../application/services/cost-estimator.service';
import {
  type IngestTraceCommand,
  type IngestedTrace,
  type SpanCommand,
  TraceIngestionRepository,
} from '../../domain/repositories/trace-ingestion.repository';

function durationMs(startedAt: Date, endedAt?: Date): number | null {
  return endedAt ? Math.max(0, endedAt.getTime() - startedAt.getTime()) : null;
}

@Injectable()
export class PrismaTraceIngestionRepository extends TraceIngestionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costEstimator: CostEstimatorService,
  ) {
    super();
  }

  async findProjectOwner(projectId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    return project?.ownerId ?? null;
  }

  async ingest(command: IngestTraceCommand): Promise<IngestedTrace> {
    const ordered = this.orderByParent(command.spans);

    return this.prisma.$transaction(async (tx) => {
      let totalTokens = 0;
      let totalCostUsd = new Prisma.Decimal(0);

      const trace = await tx.trace.create({
        data: {
          projectId: command.projectId,
          correlationId: command.correlationId,
          name: command.name,
          status: command.status,
          startedAt: command.startedAt,
          endedAt: command.endedAt ?? null,
          durationMs: durationMs(command.startedAt, command.endedAt),
          metadata: (command.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });

      // Maps a client-local span key to the generated span id, so children can
      // reference their parent. `ordered` guarantees parents come first.
      const spanIdByKey = new Map<string, string>();

      for (const span of ordered) {
        const parentSpanId = span.parentKey ? spanIdByKey.get(span.parentKey) : undefined;
        const created = await tx.span.create({
          data: {
            traceId: trace.id,
            parentSpanId: parentSpanId ?? null,
            name: span.name,
            kind: span.kind,
            status: span.status,
            startedAt: span.startedAt,
            endedAt: span.endedAt ?? null,
            durationMs: durationMs(span.startedAt, span.endedAt),
            metadata: (span.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
        spanIdByKey.set(span.key, created.id);

        if (span.llmCall) {
          const usage = span.llmCall.usage;
          const promptTokens = usage?.promptTokens ?? 0;
          const completionTokens = usage?.completionTokens ?? 0;
          const callTokens = promptTokens + completionTokens;
          const callCost = new Prisma.Decimal(
            this.costEstimator.estimate(span.llmCall.model, promptTokens, completionTokens),
          );

          totalTokens += callTokens;
          totalCostUsd = totalCostUsd.add(callCost);

          const llmCall = await tx.llmCall.create({
            data: {
              spanId: created.id,
              provider: span.llmCall.provider,
              model: span.llmCall.model,
              temperature: span.llmCall.temperature ?? null,
              latencyMs: span.llmCall.latencyMs ?? durationMs(span.startedAt, span.endedAt),
              costUsd: callCost,
              requestText: span.llmCall.requestText ?? null,
              responseText: span.llmCall.responseText ?? null,
            },
          });

          if (usage) {
            await tx.usage.create({
              data: {
                llmCallId: llmCall.id,
                promptTokens,
                completionTokens,
                totalTokens: callTokens,
              },
            });
          }
        }

        if (span.error) {
          await tx.traceError.create({
            data: {
              traceId: trace.id,
              spanId: created.id,
              kind: span.error.kind,
              message: span.error.message,
              code: span.error.code ?? null,
              metadata: (span.error.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            },
          });
        }
      }

      for (const error of command.errors) {
        await tx.traceError.create({
          data: {
            traceId: trace.id,
            kind: error.kind,
            message: error.message,
            code: error.code ?? null,
            metadata: (error.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
      }

      // Persist the server-computed rollups on the trace.
      await tx.trace.update({
        where: { id: trace.id },
        data: { totalTokens, totalCostUsd },
      });

      return {
        traceId: trace.id,
        spanCount: command.spans.length,
        totalTokens,
        totalCostUsd: totalCostUsd.toFixed(6),
      };
    });
  }

  /// Topologically orders spans so a parent is always created before its child.
  private orderByParent(spans: SpanCommand[]): SpanCommand[] {
    const byKey = new Map(spans.map((span) => [span.key, span]));
    const ordered: SpanCommand[] = [];
    const visited = new Set<string>();

    const visit = (span: SpanCommand): void => {
      if (visited.has(span.key)) {
        return;
      }
      visited.add(span.key);
      if (span.parentKey) {
        const parent = byKey.get(span.parentKey);
        if (parent) {
          visit(parent);
        }
      }
      ordered.push(span);
    };

    for (const span of spans) {
      visit(span);
    }
    return ordered;
  }
}
