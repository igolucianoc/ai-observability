import { Module } from '@nestjs/common';
import { EventsModule } from '@/modules/events/events.module';
import { CostEstimatorService } from './application/services/cost-estimator.service';
import { IngestTraceUseCase } from './application/use-cases/ingest-trace.use-case';
import { TraceIngestionRepository } from './domain/repositories/trace-ingestion.repository';
import { PrismaTraceIngestionRepository } from './persistence/repositories/prisma-trace-ingestion.repository';
import { IngestTraceController } from './presentation/controllers/ingest-trace.controller';

@Module({
  imports: [EventsModule],
  controllers: [IngestTraceController],
  providers: [
    CostEstimatorService,
    IngestTraceUseCase,
    { provide: TraceIngestionRepository, useClass: PrismaTraceIngestionRepository },
  ],
})
export class TracingModule {}
