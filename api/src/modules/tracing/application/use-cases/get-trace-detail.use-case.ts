import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import {
  type TraceDetail,
  TraceReadRepository,
} from '../../domain/repositories/trace-read.repository';

export interface GetTraceDetailInput {
  userId: string;
  traceId: string;
}

@Injectable()
export class GetTraceDetailUseCase extends BaseUseCase<GetTraceDetailInput, TraceDetail> {
  constructor(private readonly repository: TraceReadRepository) {
    super();
  }

  async execute(input: GetTraceDetailInput): Promise<TraceDetail> {
    const found = await this.repository.findDetail(input.traceId);
    if (found === null) {
      throw new ProjectNotFoundError();
    }
    if (found.ownerId !== input.userId) {
      throw new ProjectAccessDeniedError();
    }
    return found.detail;
  }
}
