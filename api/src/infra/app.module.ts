import { Module } from '@nestjs/common';
import { EnvModule } from './env/env.module';
import { HealthModule } from '@/modules/health/health.module';

@Module({
  imports: [EnvModule, HealthModule],
})
export class AppModule {}
