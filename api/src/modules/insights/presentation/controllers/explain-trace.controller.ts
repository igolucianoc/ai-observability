import {
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import {
  ProjectAccessDeniedError,
  ProjectNotFoundError,
} from '@/modules/tracing/domain/errors/tracing.errors';
import {
  ExplainTraceUseCase,
  type TraceExplanation,
} from '../../application/use-cases/explain-trace.use-case';

@Controller('insights')
export class ExplainTraceController {
  constructor(private readonly explainTrace: ExplainTraceUseCase) {}

  // AI calls are comparatively expensive; keep this rate limit tight.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('traces/:id/explain')
  @HttpCode(200)
  async handle(
    @Param('id') id: string,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<TraceExplanation>> {
    try {
      const result = await this.explainTrace.execute({ userId: current.id, traceId: id });
      return ok(result);
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        throw new NotFoundException({ message: error.message });
      }
      if (error instanceof ProjectAccessDeniedError) {
        throw new ForbiddenException({ message: error.message });
      }
      throw error;
    }
  }
}
