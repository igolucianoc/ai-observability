import { Module } from '@nestjs/common';
import { EnvModule } from './env/env.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from '@/modules/health/health.module';

@Module({
  imports: [EnvModule, PrismaModule, HealthModule],
})
export class AppModule {}
