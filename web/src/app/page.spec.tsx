import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import HomePage from './page';

describe('HomePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the login form when there is no session', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new Error('unauthorized'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('shows the dashboard heading when authenticated', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({ id: 'u1', email: 'demo@x.dev', name: 'Demo' });
    vi.spyOn(api, 'listProjects').mockResolvedValue([]);
    vi.spyOn(api, 'overview').mockResolvedValue({
      totalRequests: 0,
      totalTokens: 0,
      totalCostUsd: '0',
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      errorRate: 0,
    });
    vi.spyOn(api, 'models').mockResolvedValue([]);
    vi.spyOn(api, 'timeseries').mockResolvedValue([]);
    vi.spyOn(api, 'listTraces').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /observability/i })).toBeInTheDocument();
    });
  });
});
