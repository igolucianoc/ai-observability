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
});

export type Env = z.infer<typeof envSchema>;
