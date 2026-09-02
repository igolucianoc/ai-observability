import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProjectAccessDeniedError, ProjectNotFoundError } from '../../domain/errors/tracing.errors';
import {
  type TraceListFilter,
  type TraceListResult,
  TraceReadRepository,
} from '../../domain/repositories/trace-read.repository';
import { ListTracesUseCase } from './list-traces.use-case';

class StubTraceReadRepository extends TraceReadRepository {
  constructor(private readonly ownerId: string | null) {
    super();
  }
  findProjectOwner(): Promise<string | null> {
    return Promise.resolve(this.ownerId);
  }
  list(_filter: TraceListFilter): Promise<TraceListResult> {
    return Promise.resolve({ items: [], total: 0 });
  }
  findDetail(): Promise<null> {
    return Promise.resolve(null);
  }
}

const filter = (projectId: string): TraceListFilter => ({ projectId, page: 1, pageSize: 20 });

describe('ListTracesUseCase', () => {
  const userId = randomUUID();
  const projectId = randomUUID();
  let repository: StubTraceReadRepository;

  beforeEach(() => {
    repository = new StubTraceReadRepository(userId);
  });

  it('lists traces for the owner', async () => {
    const useCase = new ListTracesUseCase(repository);
    await expect(useCase.execute({ userId, filter: filter(projectId) })).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('denies a project owned by someone else', async () => {
    const useCase = new ListTracesUseCase(new StubTraceReadRepository(randomUUID()));
    await expect(useCase.execute({ userId, filter: filter(projectId) })).rejects.toBeInstanceOf(
      ProjectAccessDeniedError,
    );
  });

  it('reports not found for a missing project', async () => {
    const useCase = new ListTracesUseCase(new StubTraceReadRepository(null));
    await expect(useCase.execute({ userId, filter: filter(projectId) })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });
});
