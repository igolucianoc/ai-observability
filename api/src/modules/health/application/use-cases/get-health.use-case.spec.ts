import { describe, expect, it } from 'vitest';
import { GetHealthUseCase } from './get-health.use-case';

describe('GetHealthUseCase', () => {
  it('reports an ok status with uptime and an ISO timestamp', () => {
    const useCase = new GetHealthUseCase();

    const result = useCase.execute();

    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
