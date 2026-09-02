import { Controller, ForbiddenException, Get, NotFoundException, Query } from '@nestjs/common';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { ZodValidationPipe } from '@/infra/pipes/zod-validation.pipe';
import {
  type AnalyticsFilter,
  type ModelBreakdownItem,
  type OverviewMetrics,
  type TimeseriesPoint,
} from '../../domain/repositories/analytics.repository';
import {
  AnalyticsAccessDeniedError,
  AnalyticsProjectNotFoundError,
} from '../../domain/errors/analytics.errors';
import { GetModelBreakdownUseCase } from '../../application/use-cases/get-model-breakdown.use-case';
import { GetOverviewUseCase } from '../../application/use-cases/get-overview.use-case';
import { GetTimeseriesUseCase } from '../../application/use-cases/get-timeseries.use-case';
import {
  type AnalyticsQuery,
  type TimeseriesQuery,
  analyticsQuerySchema,
  timeseriesQuerySchema,
} from '../schemas/analytics-query.schema';

function toFilter(query: AnalyticsQuery): AnalyticsFilter {
  return {
    projectId: query.projectId,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
    model: query.model,
  };
}

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getOverview: GetOverviewUseCase,
    private readonly getByModel: GetModelBreakdownUseCase,
    private readonly getTimeseries: GetTimeseriesUseCase,
  ) {}

  @Get('overview')
  async overview(
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<OverviewMetrics>> {
    return this.run(() =>
      this.getOverview.execute({ userId: current.id, filter: toFilter(query) }),
    );
  }

  @Get('models')
  async models(
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<ModelBreakdownItem[]>> {
    return this.run(() => this.getByModel.execute({ userId: current.id, filter: toFilter(query) }));
  }

  @Get('timeseries')
  async timeseries(
    @Query(new ZodValidationPipe(timeseriesQuerySchema)) query: TimeseriesQuery,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<TimeseriesPoint[]>> {
    return this.run(() =>
      this.getTimeseries.execute({
        userId: current.id,
        filter: toFilter(query),
        bucket: query.bucket,
      }),
    );
  }

  /// Runs an aggregation and maps ownership errors to HTTP responses.
  private async run<TData>(action: () => Promise<TData>): Promise<HttpSuccessResponse<TData>> {
    try {
      return ok(await action());
    } catch (error) {
      if (error instanceof AnalyticsProjectNotFoundError) {
        throw new NotFoundException({ message: error.message });
      }
      if (error instanceof AnalyticsAccessDeniedError) {
        throw new ForbiddenException({ message: error.message });
      }
      throw error;
    }
  }
}
