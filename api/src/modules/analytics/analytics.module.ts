import { Module } from '@nestjs/common';
import { AnalyticsAccessService } from './application/services/analytics-access.service';
import { GetModelBreakdownUseCase } from './application/use-cases/get-model-breakdown.use-case';
import { GetOverviewUseCase } from './application/use-cases/get-overview.use-case';
import { GetTimeseriesUseCase } from './application/use-cases/get-timeseries.use-case';
import { AnalyticsRepository } from './domain/repositories/analytics.repository';
import { PrismaAnalyticsRepository } from './persistence/repositories/prisma-analytics.repository';
import { AnalyticsController } from './presentation/controllers/analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsAccessService,
    GetOverviewUseCase,
    GetModelBreakdownUseCase,
    GetTimeseriesUseCase,
    { provide: AnalyticsRepository, useClass: PrismaAnalyticsRepository },
  ],
})
export class AnalyticsModule {}
