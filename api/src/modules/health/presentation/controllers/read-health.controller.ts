import { Controller, Get } from '@nestjs/common';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import {
  GetHealthUseCase,
  type HealthStatus,
} from '../../application/use-cases/get-health.use-case';

@Controller('health')
export class ReadHealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get()
  handle(): HttpSuccessResponse<HealthStatus> {
    return ok(this.getHealth.execute());
  }
}
