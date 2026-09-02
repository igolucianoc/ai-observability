import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ProjectAccessDeniedError,
  ProjectNotFoundError,
} from '@/modules/tracing/domain/errors/tracing.errors';
import { InMemoryTraceReadRepository } from '@/modules/tracing/persistence/repositories/in-memory-trace-read.repository';
import { type Env } from '@/infra/env/env.schema';
import { EnvService } from '@/infra/env/env.service';
import { MockInferenceProvider } from '../inference/mock-inference.provider';
import { ExplainTraceUseCase } from './explain-trace.use-case';

function makeEnv(): EnvService {
  const values: Partial<Env> = { HF_MAX_NEW_TOKENS: 180 };
  return { get: <K extends keyof Env>(k: K): Env[K] => values[k] as Env[K] } as EnvService;
}

describe('ExplainTraceUseCase', () => {
  let traces: InMemoryTraceReadRepository;
  let useCase: ExplainTraceUseCase;
  const ownerId = randomUUID();
  const projectId = randomUUID();

  beforeEach(() => {
    traces = new InMemoryTraceReadRepository();
    traces.projects.push({ id: projectId, ownerId });
    useCase = new ExplainTraceUseCase(traces, new MockInferenceProvider(), makeEnv());
  });

  it('generates an explanation for an owned trace', async () => {
    const traceId = traces.seedTrace(projectId, { status: 'ERROR' });

    const result = await useCase.execute({ userId: ownerId, traceId });

    expect(result.traceId).toBe(traceId);
    expect(result.provider).toBe('mock');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('denies a trace owned by someone else', async () => {
    const traceId = traces.seedTrace(projectId);
    await expect(useCase.execute({ userId: randomUUID(), traceId })).rejects.toBeInstanceOf(
      ProjectAccessDeniedError,
    );
  });

  it('reports not found for an unknown trace', async () => {
    await expect(
      useCase.execute({ userId: ownerId, traceId: randomUUID() }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
