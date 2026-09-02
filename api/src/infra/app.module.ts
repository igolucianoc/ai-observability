import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EnvModule } from './env/env.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { JwtAuthGuard } from './http/guards/jwt-auth.guard';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { EventsModule } from '@/modules/events/events.module';
import { HealthModule } from '@/modules/health/health.module';
import { TracingModule } from '@/modules/tracing/tracing.module';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    // Default rate limit applied to every route; auth routes tighten it further.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    HealthModule,
    EventsModule,
    TracingModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
