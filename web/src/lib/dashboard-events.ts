import { z } from 'zod';
import type { DashboardEvent } from '@/types/events';

/**
 * Schema for events streamed over SSE. Boundary data is validated before it is
 * trusted by the UI; anything that does not match is discarded.
 */
const traceIngestedSchema = z.object({
  type: z.literal('trace.ingested'),
  projectId: z.string(),
  traceId: z.string(),
  status: z.enum(['SUCCESS', 'ERROR', 'TIMEOUT']),
  totalTokens: z.number(),
  totalCostUsd: z.string(),
  at: z.string(),
});

const dashboardEventSchema = z.discriminatedUnion('type', [traceIngestedSchema]);

/**
 * Parses a raw SSE `data` payload into a typed DashboardEvent, or returns null
 * if the payload is not valid JSON or does not match a known event shape.
 */
export function parseDashboardEvent(raw: string): DashboardEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = dashboardEventSchema.safeParse(json);
  return result.success ? result.data : null;
}
