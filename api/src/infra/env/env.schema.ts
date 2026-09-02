import { z } from 'zod';

/**
 * Runtime-validated environment schema. The application refuses to boot with an
 * invalid environment, keeping configuration errors loud and early.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  API_CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  /// Access token lifetime (seconds). Default: 15 minutes.
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  /// Refresh token lifetime (seconds). Default: 7 days.
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  /// Whether auth cookies require HTTPS. Should be true in production.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;
