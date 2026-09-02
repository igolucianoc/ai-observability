/// Field names whose values must never appear in logs (secrets/PII).
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'jwt_access_secret',
  'jwt_refresh_secret',
]);

const REDACTED = '[redacted]';
const MAX_DEPTH = 6;

/**
 * Returns a deep copy of a value with sensitive fields masked. Used before any
 * structured value is written to the logs, so secrets and PII never leak into
 * the telemetry pipeline.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(val, depth + 1);
  }
  return output;
}
