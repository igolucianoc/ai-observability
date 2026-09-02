import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { DashboardEventsService } from '@/modules/events/application/dashboard-events.service';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import {
  type IngestTraceCommand,
  type IngestedTrace,
  TraceIngestionRepository,
} from '../../domain/repositories/trace-ingestion.repository';

export interface IngestTraceUseCaseInput {
  ownerId: string;
  command: IngestTraceCommand;
}

/**
 * Ingests a validated trace after confirming the authenticated user owns the
 * target project. Ownership is enforced here, not in the transport layer.
 */
@Injectable()
export class IngestTraceUseCase extends BaseUseCase<IngestTraceUseCaseInput, IngestedTrace> {
  constructor(
    private readonly repository: TraceIngestionRepository,
    private readonly events: DashboardEventsService,
  ) {
    super();
  }

  async execute(input: IngestTraceUseCaseInput): Promise<IngestedTrace> {
    const ownerId = await this.repository.findProjectOwner(input.command.projectId);
    if (ownerId === null) {
      throw new ProjectNotFoundError();
    }
    if (ownerId !== input.ownerId) {
      throw new ProjectAccessDeniedError();
    }

    const ingested = await this.repository.ingest(input.command);

    // Notify dashboard subscribers in near real time.
    this.events.publish({
      type: 'trace.ingested',
      projectId: input.command.projectId,
      traceId: ingested.traceId,
      status: input.command.status,
      totalTokens: ingested.totalTokens,
      totalCostUsd: ingested.totalCostUsd,
      at: new Date().toISOString(),
    });

    return ingested;
  }
}
