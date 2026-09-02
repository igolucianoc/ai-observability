import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
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
  constructor(private readonly repository: TraceIngestionRepository) {
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
    return this.repository.ingest(input.command);
  }
}
