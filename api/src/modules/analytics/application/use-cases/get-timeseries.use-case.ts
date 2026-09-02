import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import {
  type AnalyticsFilter,
  AnalyticsRepository,
  type TimeseriesBucket,
  type TimeseriesPoint,
} from '../../domain/repositories/analytics.repository';
import { AnalyticsAccessService } from '../services/analytics-access.service';

export interface GetTimeseriesInput {
  userId: string;
  filter: AnalyticsFilter;
  bucket: TimeseriesBucket;
}

@Injectable()
export class GetTimeseriesUseCase extends BaseUseCase<GetTimeseriesInput, TimeseriesPoint[]> {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly access: AnalyticsAccessService,
  ) {
    super();
  }

  async execute(input: GetTimeseriesInput): Promise<TimeseriesPoint[]> {
    await this.access.assertOwnership(input.filter.projectId, input.userId);
    return this.repository.timeseries(input.filter, input.bucket);
  }
}
