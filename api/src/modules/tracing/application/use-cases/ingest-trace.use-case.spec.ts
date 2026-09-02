import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import { type IngestTraceCommand } from '../../domain/repositories/trace-ingestion.repository';
import { InMemoryTraceIngestionRepository } from '../../persistence/repositories/in-memory-trace-ingestion.repository';
import { IngestTraceUseCase } from './ingest-trace.use-case';

function makeCommand(projectId: string): IngestTraceCommand {
  return {
    projectId,
    correlationId: 'corr-1',
    name: 'chat-completion',
    status: 'SUCCESS',
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    endedAt: new Date('2026-01-01T00:00:01.000Z'),
    spans: [
      {
        key: 'llm',
        name: 'llm-call',
        kind: 'LLM',
        status: 'SUCCESS',
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        llmCall: {
          provider: 'openai',
          model: 'gpt-4o',
          usage: { promptTokens: 1_000_000, completionTokens: 1_000_000 },
        },
      },
    ],
    errors: [],
  };
}

describe('IngestTraceUseCase', () => {
  let repository: InMemoryTraceIngestionRepository;
  let useCase: IngestTraceUseCase;
  const ownerId = randomUUID();
  const projectId = randomUUID();

  beforeEach(() => {
    repository = new InMemoryTraceIngestionRepository();
    repository.projects.push({ id: projectId, ownerId });
    useCase = new IngestTraceUseCase(repository);
  });

  it('rejects ingestion into a non-existent project', async () => {
    await expect(
      useCase.execute({ ownerId, command: makeCommand(randomUUID()) }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('rejects ingestion into a project owned by someone else', async () => {
    await expect(
      useCase.execute({ ownerId: randomUUID(), command: makeCommand(projectId) }),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);
  });

  it('ingests and computes token and cost rollups server-side', async () => {
    const result = await useCase.execute({ ownerId, command: makeCommand(projectId) });

    expect(result.spanCount).toBe(1);
    expect(result.totalTokens).toBe(2_000_000);
    // gpt-4o: 1M prompt * 2.5 + 1M completion * 10 = 12.5 USD
    expect(result.totalCostUsd).toBe('12.500000');
    expect(repository.traces).toHaveLength(1);
  });
});
