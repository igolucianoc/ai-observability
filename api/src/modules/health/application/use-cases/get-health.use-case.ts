import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';

export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

/**
 * Reports the API liveness status. Kept dependency-free so it can answer even
 * when downstream services (DB, cache) are unavailable.
 */
@Injectable()
export class GetHealthUseCase extends BaseUseCase<void, HealthStatus> {
  execute(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
