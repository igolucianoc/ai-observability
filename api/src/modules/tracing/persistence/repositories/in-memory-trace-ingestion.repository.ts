import { randomUUID } from 'node:crypto';
import { CostEstimatorService } from '../../application/services/cost-estimator.service';
import {
  type IngestTraceCommand,
  type IngestedTrace,
  TraceIngestionRepository,
} from '../../domain/repositories/trace-ingestion.repository';

interface StoredProject {
  id: string;
  ownerId: string;
}

/**
 * In-memory ingestion store for tests. Mirrors the rollup logic of the Prisma
 * implementation so cost/token totals can be asserted without a database.
 */
export class InMemoryTraceIngestionRepository extends TraceIngestionRepository {
  readonly projects: StoredProject[] = [];
  readonly traces: Array<IngestedTrace & { command: IngestTraceCommand }> = [];

  constructor(private readonly costEstimator: CostEstimatorService = new CostEstimatorService()) {
    super();
  }

  findProjectOwner(projectId: string): Promise<string | null> {
    return Promise.resolve(this.projects.find((p) => p.id === projectId)?.ownerId ?? null);
  }

  ingest(command: IngestTraceCommand): Promise<IngestedTrace> {
    let totalTokens = 0;
    let totalCostUsd = 0;

    for (const span of command.spans) {
      if (!span.llmCall?.usage) {
        continue;
      }
      const { promptTokens, completionTokens } = span.llmCall.usage;
      totalTokens += promptTokens + completionTokens;
      totalCostUsd += this.costEstimator.estimate(
        span.llmCall.model,
        promptTokens,
        completionTokens,
      );
    }

    const result: IngestedTrace = {
      traceId: randomUUID(),
      spanCount: command.spans.length,
      totalTokens,
      totalCostUsd: totalCostUsd.toFixed(6),
    };
    this.traces.push({ ...result, command });
    return Promise.resolve(result);
  }
}
