import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createE2EApp, type E2EContext } from './e2e-app';

async function loginCookie(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return res.headers['set-cookie'] as unknown as string[];
}

describe('Analytics & SSE (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let cookie: string[];
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    const ownerId = await ctx.seedUser('owner@example.com', 'super-secret-1');
    const otherId = await ctx.seedUser('other@example.com', 'super-secret-2');
    projectId = ctx.seedProject(ownerId);
    otherProjectId = ctx.seedProject(otherId);
    cookie = await loginCookie(app, 'owner@example.com', 'super-secret-1');

    // Two traces for overview aggregation.
    ctx.analytics.traces.push(
      {
        projectId,
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: 'SUCCESS',
        durationMs: 1000,
        totalTokens: 100,
        totalCostUsd: 0.01,
        calls: [{ model: 'gpt-4o', tokens: 100, costUsd: 0.01, latencyMs: 1000 }],
      },
      {
        projectId,
        startedAt: new Date('2026-01-02T00:00:00.000Z'),
        status: 'ERROR',
        durationMs: 3000,
        totalTokens: 50,
        totalCostUsd: 0.02,
        calls: [{ model: 'gpt-4o', tokens: 50, costUsd: 0.02, latencyMs: 3000 }],
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns overview metrics for the owned project', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/analytics/overview?projectId=${projectId}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.data.totalRequests).toBe(2);
    expect(res.body.data.totalTokens).toBe(150);
    expect(res.body.data.errorRate).toBe(0.5);
  });

  it('returns a model breakdown', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/analytics/models?projectId=${projectId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.data[0].model).toBe('gpt-4o');
  });

  it('applies the model filter', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/analytics/overview?projectId=${projectId}&model=claude-3-5-sonnet`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.data.totalRequests).toBe(0);
  });

  it('forbids analytics for a project owned by someone else (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/analytics/overview?projectId=${otherProjectId}`)
      .set('Cookie', cookie)
      .expect(403);
  });

  it('rejects an invalid date range with 400', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/analytics/overview?projectId=${projectId}&from=2026-05-01T00:00:00Z&to=2026-01-01T00:00:00Z`,
      )
      .set('Cookie', cookie)
      .expect(400);
  });

  it('denies the SSE stream for a project owned by someone else (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/events/stream?projectId=${otherProjectId}`)
      .set('Cookie', cookie)
      .expect(403);
  });
});
