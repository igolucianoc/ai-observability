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
  /// Hugging Face Inference API token. When absent or empty, AI insights run in
  /// mock mode. An empty string (common from compose defaults) is treated as unset.
  HF_API_TOKEN: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  /// Model used for inference (chat + trace explanation), via the HF router.
  /// Serves as the default when a request does not specify a model.
  HF_MODEL: z.string().default('meta-llama/Llama-3.1-8B-Instruct'),
  /// Comma-separated allowlist of models the chat may select. The frontend
  /// lists these in the model picker; the backend rejects anything outside it.
  HF_MODELS: z
    .string()
    .default(
      [
        'meta-llama/Llama-3.1-8B-Instruct',
        'meta-llama/Llama-3.3-70B-Instruct',
        'deepseek-ai/DeepSeek-V3-0324',
        'Qwen/Qwen2.5-7B-Instruct',
        'mistralai/Mistral-7B-Instruct-v0.3',
      ].join(','),
    )
    .transform((value) =>
      value
        .split(',')
        .map((model) => model.trim())
        .filter((model) => model.length > 0),
    ),
  /// Timeout (ms) for a Hugging Face call, so a slow provider can't hang requests.
  HF_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  /// Cap on generated tokens, to bound cost and latency.
  HF_MAX_NEW_TOKENS: z.coerce.number().int().positive().max(1000).default(180),
});

export type Env = z.infer<typeof envSchema>;
