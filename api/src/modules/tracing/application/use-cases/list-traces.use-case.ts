import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import {
  type TraceListFilter,
  type TraceListResult,
  TraceReadRepository,
} from '../../domain/repositories/trace-read.repository';

export interface ListTracesInput {
  userId: string;
  filter: TraceListFilter;
}

@Injectable()
export class ListTracesUseCase extends BaseUseCase<ListTracesInput, TraceListResult> {
  constructor(private readonly repository: TraceReadRepository) {
    super();
  }

  async execute(input: ListTracesInput): Promise<TraceListResult> {
    const ownerId = await this.repository.findProjectOwner(input.filter.projectId);
    if (ownerId === null) {
      throw new ProjectNotFoundError();
    }
    if (ownerId !== input.userId) {
      throw new ProjectAccessDeniedError();
    }
    return this.repository.list(input.filter);
  }
}
