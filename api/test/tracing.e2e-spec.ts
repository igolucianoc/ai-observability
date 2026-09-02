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

function validTrace(projectId: string): Record<string, unknown> {
  return {
    projectId,
    correlationId: 'e2e-corr',
    name: 'chat',
    status: 'SUCCESS',
    startedAt: '2026-01-01T00:00:00.000Z',
    spans: [
      {
        key: 'llm',
        name: 'llm-call',
        kind: 'LLM',
        status: 'SUCCESS',
        startedAt: '2026-01-01T00:00:00.000Z',
        llmCall: {
          provider: 'openai',
          model: 'gpt-4o',
          usage: { promptTokens: 1000000, completionTokens: 1000000 },
        },
      },
    ],
  };
}

describe('Tracing ingestion & read (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let cookie: string[];
  let ownerId: string;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    ownerId = await ctx.seedUser('owner@example.com', 'super-secret-1');
    const otherId = await ctx.seedUser('other@example.com', 'super-secret-2');
    projectId = ctx.seedProject(ownerId);
    otherProjectId = ctx.seedProject(otherId);
    cookie = await loginCookie(app, 'owner@example.com', 'super-secret-1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ingests a valid trace and computes rollups (202)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/traces/ingest')
      .set('Cookie', cookie)
      .send(validTrace(projectId))
      .expect(202);

    expect(res.body.data.totalTokens).toBe(2_000_000);
    expect(res.body.data.totalCostUsd).toBe('12.500000');
  });

  it('rejects a malformed payload with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/traces/ingest')
      .set('Cookie', cookie)
      .send({ projectId, status: 'NOPE' })
      .expect(400);
  });

  it('forbids ingestion into a project owned by someone else (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/traces/ingest')
      .set('Cookie', cookie)
      .send(validTrace(otherProjectId))
      .expect(403);
  });

  it('lists traces for the owner with pagination meta', async () => {
    ctx.traceRead.seedTrace(projectId, { name: 'seeded-1' });
    ctx.traceRead.seedTrace(projectId, { name: 'seeded-2' });

    const res = await request(app.getHttpServer())
      .get(`/api/traces?projectId=${projectId}&pageSize=1`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('returns 404 for a trace that does not exist', async () => {
    await request(app.getHttpServer())
      .get('/api/traces/11111111-1111-1111-1111-111111111111')
      .set('Cookie', cookie)
      .expect(404);
  });
});
