import { Module } from '@nestjs/common';
import { EventsModule } from '@/modules/events/events.module';
import { CostEstimatorService } from './application/services/cost-estimator.service';
import { GetTraceDetailUseCase } from './application/use-cases/get-trace-detail.use-case';
import { IngestTraceUseCase } from './application/use-cases/ingest-trace.use-case';
import { ListTracesUseCase } from './application/use-cases/list-traces.use-case';
import { TraceIngestionRepository } from './domain/repositories/trace-ingestion.repository';
import { TraceReadRepository } from './domain/repositories/trace-read.repository';
import { PrismaTraceIngestionRepository } from './persistence/repositories/prisma-trace-ingestion.repository';
import { PrismaTraceReadRepository } from './persistence/repositories/prisma-trace-read.repository';
import { IngestTraceController } from './presentation/controllers/ingest-trace.controller';
import { ReadTraceController } from './presentation/controllers/read-trace.controller';

@Module({
  imports: [EventsModule],
  controllers: [IngestTraceController, ReadTraceController],
  providers: [
    CostEstimatorService,
    IngestTraceUseCase,
    ListTracesUseCase,
    GetTraceDetailUseCase,
    { provide: TraceIngestionRepository, useClass: PrismaTraceIngestionRepository },
    { provide: TraceReadRepository, useClass: PrismaTraceReadRepository },
  ],
  exports: [TraceReadRepository, IngestTraceUseCase],
})
export class TracingModule {}
