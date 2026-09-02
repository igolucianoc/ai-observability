import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AnalyticsAccessDeniedError,
  AnalyticsProjectNotFoundError,
} from '../../domain/errors/analytics.errors';
import {
  InMemoryAnalyticsRepository,
  type InMemoryTrace,
} from '../../persistence/repositories/in-memory-analytics.repository';
import { AnalyticsAccessService } from '../services/analytics-access.service';
import { GetOverviewUseCase } from './get-overview.use-case';

function trace(overrides: Partial<InMemoryTrace> & { projectId: string }): InMemoryTrace {
  return {
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    status: 'SUCCESS',
    durationMs: 1000,
    totalTokens: 100,
    totalCostUsd: 0.01,
    calls: [{ model: 'gpt-4o', tokens: 100, costUsd: 0.01, latencyMs: 1000 }],
    ...overrides,
  };
}

describe('GetOverviewUseCase', () => {
  let repository: InMemoryAnalyticsRepository;
  let useCase: GetOverviewUseCase;
  const ownerId = randomUUID();
  const projectId = randomUUID();

  beforeEach(() => {
    repository = new InMemoryAnalyticsRepository();
    repository.projects.push({ id: projectId, ownerId });
    useCase = new GetOverviewUseCase(repository, new AnalyticsAccessService(repository));
  });

  it('denies access to a project the user does not own', async () => {
    await expect(
      useCase.execute({ userId: randomUUID(), filter: { projectId } }),
    ).rejects.toBeInstanceOf(AnalyticsAccessDeniedError);
  });

  it('reports not found for an unknown project', async () => {
    await expect(
      useCase.execute({ userId: ownerId, filter: { projectId: randomUUID() } }),
    ).rejects.toBeInstanceOf(AnalyticsProjectNotFoundError);
  });

  it('aggregates requests, tokens, cost and error rate', async () => {
    repository.traces.push(
      trace({ projectId }),
      trace({ projectId, status: 'ERROR', durationMs: 3000 }),
      trace({ projectId, status: 'TIMEOUT', durationMs: 5000 }),
      trace({ projectId, totalTokens: 200, totalCostUsd: 0.02 }),
    );

    const result = await useCase.execute({ userId: ownerId, filter: { projectId } });

    expect(result.totalRequests).toBe(4);
    expect(result.totalTokens).toBe(500);
    // 0.01 + 0.01 + 0.01 + 0.02
    expect(result.totalCostUsd).toBe('0.050000');
    // 2 of 4 traces are not SUCCESS.
    expect(result.errorRate).toBe(0.5);
  });

  it('applies the date range filter', async () => {
    repository.traces.push(
      trace({ projectId, startedAt: new Date('2026-01-01T00:00:00.000Z') }),
      trace({ projectId, startedAt: new Date('2026-03-01T00:00:00.000Z') }),
    );

    const result = await useCase.execute({
      userId: ownerId,
      filter: {
        projectId,
        from: new Date('2026-02-01T00:00:00.000Z'),
        to: new Date('2026-04-01T00:00:00.000Z'),
      },
    });

    expect(result.totalRequests).toBe(1);
  });
});
