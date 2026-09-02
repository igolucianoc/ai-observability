import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import {
  type AnalyticsFilter,
  AnalyticsRepository,
  type OverviewMetrics,
} from '../../domain/repositories/analytics.repository';
import { AnalyticsAccessService } from '../services/analytics-access.service';

export interface AnalyticsUseCaseInput {
  userId: string;
  filter: AnalyticsFilter;
}

@Injectable()
export class GetOverviewUseCase extends BaseUseCase<AnalyticsUseCaseInput, OverviewMetrics> {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly access: AnalyticsAccessService,
  ) {
    super();
  }

  async execute(input: AnalyticsUseCaseInput): Promise<OverviewMetrics> {
    await this.access.assertOwnership(input.filter.projectId, input.userId);
    return this.repository.overview(input.filter);
  }
}
