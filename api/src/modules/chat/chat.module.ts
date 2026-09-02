import { Module } from '@nestjs/common';
import { EnvService } from '@/infra/env/env.service';
import { HuggingFaceInferenceProvider } from '@/modules/insights/application/inference/huggingface-inference.provider';
import { InferenceProvider } from '@/modules/insights/application/inference/inference-provider';
import { MockInferenceProvider } from '@/modules/insights/application/inference/mock-inference.provider';
import { TracingModule } from '@/modules/tracing/tracing.module';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { ChatController } from './presentation/controllers/chat.controller';

@Module({
  imports: [TracingModule],
  controllers: [ChatController],
  providers: [
    SendChatMessageUseCase,
    // Usa o provedor real do Hugging Face quando há token configurado; caso
    // contrário, cai no mock determinístico para funcionar offline.
    {
      provide: InferenceProvider,
      useFactory: (env: EnvService): InferenceProvider =>
        env.get('HF_API_TOKEN')
          ? new HuggingFaceInferenceProvider(env)
          : new MockInferenceProvider(),
      inject: [EnvService],
    },
  ],
})
export class ChatModule {}
