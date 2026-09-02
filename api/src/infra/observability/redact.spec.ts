import { describe, expect, it } from 'vitest';
import { redact } from './redact';

describe('redact', () => {
  it('masks sensitive keys at any depth', () => {
    const input = {
      email: 'user@example.com',
      password: 'secret',
      nested: { accessToken: 'abc', refreshToken: 'def', keep: 'ok' },
      headers: { authorization: 'Bearer xyz', cookie: 'a=b' },
    };

    const result = redact(input) as Record<string, unknown>;
    const nested = result.nested as Record<string, unknown>;
    const headers = result.headers as Record<string, unknown>;

    expect(result.password).toBe('[redacted]');
    expect(nested.accessToken).toBe('[redacted]');
    expect(nested.refreshToken).toBe('[redacted]');
    expect(nested.keep).toBe('ok');
    expect(headers.authorization).toBe('[redacted]');
    expect(headers.cookie).toBe('[redacted]');
    // Non-sensitive values pass through unchanged.
    expect(result.email).toBe('user@example.com');
  });

  it('is case-insensitive on key names', () => {
    const result = redact({ Password: 'x', TOKEN: 'y' }) as Record<string, unknown>;
    expect(result.Password).toBe('[redacted]');
    expect(result.TOKEN).toBe('[redacted]');
  });

  it('leaves primitives and arrays of primitives intact', () => {
    expect(redact('plain')).toBe('plain');
    expect(redact(42)).toBe(42);
    expect(redact(['a', 'b'])).toEqual(['a', 'b']);
  });
});
