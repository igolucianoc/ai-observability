import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { ZodValidationPipe } from '@/infra/pipes/zod-validation.pipe';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import {
  type TraceDetail,
  type TraceListItem,
} from '../../domain/repositories/trace-read.repository';
import { GetTraceDetailUseCase } from '../../application/use-cases/get-trace-detail.use-case';
import { ListTracesUseCase } from '../../application/use-cases/list-traces.use-case';
import { type ListTracesQuery, listTracesQuerySchema } from '../schemas/list-traces.schema';

@Controller('traces')
export class ReadTraceController {
  constructor(
    private readonly listTraces: ListTracesUseCase,
    private readonly getTraceDetail: GetTraceDetailUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listTracesQuerySchema)) query: ListTracesQuery,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<TraceListItem[]>> {
    try {
      const result = await this.listTraces.execute({
        userId: current.id,
        filter: {
          projectId: query.projectId,
          from: query.from ? new Date(query.from) : undefined,
          to: query.to ? new Date(query.to) : undefined,
          status: query.status,
          model: query.model,
          page: query.page,
          pageSize: query.pageSize,
        },
      });
      return ok(result.items, {
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize),
        },
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<TraceDetail>> {
    try {
      return ok(await this.getTraceDetail.execute({ userId: current.id, traceId: id }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof ProjectNotFoundError) {
      return new NotFoundException({ message: error.message });
    }
    if (error instanceof ProjectAccessDeniedError) {
      return new ForbiddenException({ message: error.message });
    }
    return error instanceof Error ? error : new Error('Unknown error');
  }
}
