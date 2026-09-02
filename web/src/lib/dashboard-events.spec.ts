import { describe, expect, it } from 'vitest';
import { parseDashboardEvent } from './dashboard-events';

describe('parseDashboardEvent', () => {
  it('parses a valid trace.ingested event', () => {
    const raw = JSON.stringify({
      type: 'trace.ingested',
      projectId: 'p1',
      traceId: 't1',
      status: 'SUCCESS',
      totalTokens: 150,
      totalCostUsd: '0.000045',
      at: '2026-02-01T00:00:00.000Z',
    });

    const event = parseDashboardEvent(raw);

    expect(event).not.toBeNull();
    expect(event?.type).toBe('trace.ingested');
    expect(event?.traceId).toBe('t1');
  });

  it('returns null for invalid JSON', () => {
    expect(parseDashboardEvent('not json{')).toBeNull();
  });

  it('returns null for a payload that does not match a known event', () => {
    expect(parseDashboardEvent(JSON.stringify({ type: 'unknown', foo: 1 }))).toBeNull();
  });

  it('returns null when a required field has the wrong type', () => {
    const raw = JSON.stringify({
      type: 'trace.ingested',
      projectId: 'p1',
      traceId: 't1',
      status: 'SUCCESS',
      totalTokens: 'many',
      totalCostUsd: '0.1',
      at: '2026-02-01T00:00:00.000Z',
    });
    expect(parseDashboardEvent(raw)).toBeNull();
  });
});
