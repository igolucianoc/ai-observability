import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ingestTraceSchema } from './ingest-trace.schema';

function baseTrace(): Record<string, unknown> {
  return {
    projectId: randomUUID(),
    correlationId: 'corr-1',
    name: 'trace',
    status: 'SUCCESS',
    startedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ingestTraceSchema', () => {
  it('accepts a minimal valid trace and applies array defaults', () => {
    const result = ingestTraceSchema.safeParse(baseTrace());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.spans).toEqual([]);
      expect(result.data.errors).toEqual([]);
    }
  });

  it('rejects an invalid status enum', () => {
    const result = ingestTraceSchema.safeParse({ ...baseTrace(), status: 'MAYBE' });
    expect(result.success).toBe(false);
  });

  it('rejects a span whose parentKey does not exist in the payload', () => {
    const result = ingestTraceSchema.safeParse({
      ...baseTrace(),
      spans: [
        {
          key: 'child',
          parentKey: 'ghost',
          name: 's',
          kind: 'LLM',
          status: 'SUCCESS',
          startedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate span keys', () => {
    const span = {
      key: 'dup',
      name: 's',
      kind: 'TOOL',
      status: 'SUCCESS',
      startedAt: '2026-01-01T00:00:00.000Z',
    };
    const result = ingestTraceSchema.safeParse({ ...baseTrace(), spans: [span, { ...span }] });
    expect(result.success).toBe(false);
  });
});
