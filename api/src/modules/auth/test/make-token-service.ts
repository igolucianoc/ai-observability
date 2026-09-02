import { JwtService } from '@nestjs/jwt';
import { type Env } from '@/infra/env/env.schema';
import { EnvService } from '@/infra/env/env.service';
import { TokenService } from '../application/services/token.service';

const TEST_ENV: Partial<Env> = {
  JWT_ACCESS_SECRET: 'test-access-secret-min-16-chars',
  JWT_REFRESH_SECRET: 'test-refresh-secret-min-16-chars',
  JWT_ACCESS_TTL: 900,
  JWT_REFRESH_TTL: 604800,
};

/**
 * Builds a real TokenService backed by an in-memory env, for use-case tests.
 */
export function makeTokenService(): TokenService {
  const env = {
    get: <TKey extends keyof Env>(key: TKey): Env[TKey] => TEST_ENV[key] as Env[TKey],
  } as EnvService;
  return new TokenService(new JwtService(), env);
}
