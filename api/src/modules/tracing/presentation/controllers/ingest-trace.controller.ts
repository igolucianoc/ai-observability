import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { ZodValidationPipe } from '@/infra/pipes/zod-validation.pipe';
import { type IngestedTrace } from '../../domain/repositories/trace-ingestion.repository';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import { IngestTraceUseCase } from '../../application/use-cases/ingest-trace.use-case';
import { toIngestTraceCommand } from '../ingest-trace.mapper';
import { type IngestTraceInput, ingestTraceSchema } from '../schemas/ingest-trace.schema';

@Controller('traces')
export class IngestTraceController {
  constructor(private readonly ingestTrace: IngestTraceUseCase) {}

  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @Post('ingest')
  @HttpCode(202)
  async handle(
    @Body(new ZodValidationPipe(ingestTraceSchema)) body: IngestTraceInput,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<IngestedTrace>> {
    try {
      const result = await this.ingestTrace.execute({
        ownerId: current.id,
        command: toIngestTraceCommand(body),
      });
      return ok(result, { message: 'Trace ingested' });
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
