import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import {
  AnalyticsRepository,
  type ModelBreakdownItem,
} from '../../domain/repositories/analytics.repository';
import { AnalyticsAccessService } from '../services/analytics-access.service';
import { type AnalyticsUseCaseInput } from './get-overview.use-case';

@Injectable()
export class GetModelBreakdownUseCase extends BaseUseCase<
  AnalyticsUseCaseInput,
  ModelBreakdownItem[]
> {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly access: AnalyticsAccessService,
  ) {
    super();
  }

  async execute(input: AnalyticsUseCaseInput): Promise<ModelBreakdownItem[]> {
    await this.access.assertOwnership(input.filter.projectId, input.userId);
    return this.repository.byModel(input.filter);
  }
}
