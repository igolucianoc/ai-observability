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

describe('Insights — explain trace (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let cookie: string[];
  let projectId: string;
  let traceId: string;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    const ownerId = await ctx.seedUser('owner@example.com', 'super-secret-1');
    projectId = ctx.seedProject(ownerId);
    traceId = ctx.traceRead.seedTrace(projectId, { status: 'ERROR', name: 'failed-run' });
    cookie = await loginCookie(app, 'owner@example.com', 'super-secret-1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an AI explanation for an owned trace (mock provider)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/insights/traces/${traceId}/explain`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.data.traceId).toBe(traceId);
    expect(res.body.data.provider).toBe('mock');
    expect(typeof res.body.data.explanation).toBe('string');
    expect(res.body.data.explanation.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown trace', async () => {
    await request(app.getHttpServer())
      .post('/api/insights/traces/11111111-1111-1111-1111-111111111111/explain')
      .set('Cookie', cookie)
      .expect(404);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).post(`/api/insights/traces/${traceId}/explain`).expect(401);
  });
});
