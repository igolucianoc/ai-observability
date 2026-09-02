import { Module } from '@nestjs/common';
import { GetHealthUseCase } from './application/use-cases/get-health.use-case';
import { ReadHealthController } from './presentation/controllers/read-health.controller';

@Module({
  controllers: [ReadHealthController],
  providers: [GetHealthUseCase],
})
export class HealthModule {}
