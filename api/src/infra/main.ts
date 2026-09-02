import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { EnvService } from './env/env.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvService);

  // Input validation is handled per-route via Zod (ZodValidationPipe), so the
  // class-validator based global ValidationPipe is intentionally not used.
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.get('API_CORS_ORIGINS'), credentials: true });

  const port = env.get('API_PORT');
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
