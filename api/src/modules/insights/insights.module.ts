import { Module } from '@nestjs/common';
import { EnvService } from '@/infra/env/env.service';
import { TracingModule } from '@/modules/tracing/tracing.module';
import { ExplainTraceUseCase } from './application/use-cases/explain-trace.use-case';
import { HuggingFaceInferenceProvider } from './application/inference/huggingface-inference.provider';
import { InferenceProvider } from './application/inference/inference-provider';
import { MockInferenceProvider } from './application/inference/mock-inference.provider';
import { ExplainTraceController } from './presentation/controllers/explain-trace.controller';

@Module({
  imports: [TracingModule],
  controllers: [ExplainTraceController],
  providers: [
    ExplainTraceUseCase,
    // Use the real Hugging Face provider when a token is configured; otherwise
    // fall back to the deterministic mock so the feature works offline.
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
export class InsightsModule {}
