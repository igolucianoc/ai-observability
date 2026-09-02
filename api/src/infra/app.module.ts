import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EnvModule } from './env/env.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { JwtAuthGuard } from './http/guards/jwt-auth.guard';
import { HttpLoggingInterceptor } from './observability/http-logging.interceptor';
import { RequestContextMiddleware } from './observability/request-context.middleware';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { EventsModule } from '@/modules/events/events.module';
import { HealthModule } from '@/modules/health/health.module';
import { InsightsModule } from '@/modules/insights/insights.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
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
    ProjectsModule,
    TracingModule,
    AnalyticsModule,
    InsightsModule,
    ChatModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // `{*path}` is the path-to-regexp v8 syntax for "all routes" used by Nest 11.
    consumer.apply(RequestContextMiddleware).forRoutes('{*path}');
  }
}
