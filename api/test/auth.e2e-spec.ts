import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createE2EApp, type E2EContext } from './e2e-app';

describe('Auth (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    await ctx.seedUser('alice@example.com', 'super-secret-1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks a protected route without a session', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('logs in, sets cookies, and serves /auth/me', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'super-secret-1' })
      .expect(200);

    const cookies = login.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(me.body.data.email).toBe('alice@example.com');
  });

  it('rejects invalid credentials with a generic 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' })
      .expect(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects a malformed login body with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email' })
      .expect(400);
  });
});
