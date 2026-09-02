import { describe, expect, it } from 'vitest';
import { GetHealthUseCase } from '../../application/use-cases/get-health.use-case';
import { ReadHealthController } from './read-health.controller';

describe('ReadHealthController', () => {
  it('wraps the health status in the standard success envelope', () => {
    const controller = new ReadHealthController(new GetHealthUseCase());

    const response = controller.handle();

    expect(response).toHaveProperty('data');
    expect(response.data.status).toBe('ok');
  });
});
