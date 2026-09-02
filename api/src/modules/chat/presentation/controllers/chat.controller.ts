import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EnvService } from '@/infra/env/env.service';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { ZodValidationPipe } from '@/infra/pipes/zod-validation.pipe';
import {
  ProjectAccessDeniedError,
  ProjectNotFoundError,
} from '@/modules/tracing/domain/errors/tracing.errors';
import {
  type ChatReply,
  SendChatMessageUseCase,
  UnsupportedModelError,
} from '../../application/use-cases/send-chat-message.use-case';
import { type ChatMessageInput, chatMessageSchema } from '../schemas/chat.schema';

@Controller('ai')
export class ChatController {
  constructor(
    private readonly sendChatMessage: SendChatMessageUseCase,
    private readonly env: EnvService,
  ) {}

  /// Lista os modelos disponíveis para o seletor do chat, com o padrão em destaque.
  @Get('models')
  models(): HttpSuccessResponse<{ models: string[]; default: string }> {
    return ok({ models: this.env.get('HF_MODELS'), default: this.env.get('HF_MODEL') });
  }

  // Chamadas de IA são comparativamente caras; mantém o rate limit apertado.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('chat')
  @HttpCode(200)
  async handle(
    @Body(new ZodValidationPipe(chatMessageSchema)) body: ChatMessageInput,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<ChatReply>> {
    try {
      const result = await this.sendChatMessage.execute({
        userId: current.id,
        projectId: body.projectId,
        message: body.message,
        model: body.model,
      });
      return ok(result);
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        throw new NotFoundException({ message: error.message });
      }
      if (error instanceof ProjectAccessDeniedError) {
        throw new ForbiddenException({ message: error.message });
      }
      if (error instanceof UnsupportedModelError) {
        throw new BadRequestException({ message: error.message });
      }
      throw error;
    }
  }
}
