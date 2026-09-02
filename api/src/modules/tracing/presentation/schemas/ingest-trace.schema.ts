import { z } from 'zod';

const executionStatus = z.enum(['SUCCESS', 'ERROR', 'TIMEOUT']);
const spanKind = z.enum(['LLM', 'RETRIEVAL', 'TOOL', 'EMBEDDING', 'CHAIN']);
const errorKind = z.enum(['PROVIDER_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'VALIDATION', 'INTERNAL']);

const isoDateTime = z.string().datetime({ offset: true });
const metadata = z.record(z.unknown()).optional();

const usageSchema = z.object({
  promptTokens: z.number().int().nonnegative().default(0),
  completionTokens: z.number().int().nonnegative().default(0),
});

const llmCallSchema = z.object({
  provider: z.string().min(1).max(120),
  model: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2).optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  /// Cost is estimated server-side from usage; a client-sent value is ignored.
  requestText: z.string().max(20_000).optional(),
  responseText: z.string().max(20_000).optional(),
  usage: usageSchema.optional(),
});

const spanErrorSchema = z.object({
  kind: errorKind,
  message: z.string().min(1).max(2000),
  code: z.string().max(120).optional(),
  metadata,
});

const spanSchema = z.object({
  /// Client-local key used to reference this span as a parent within the payload.
  key: z.string().min(1).max(120),
  parentKey: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(200),
  kind: spanKind,
  status: executionStatus,
  startedAt: isoDateTime,
  endedAt: isoDateTime.optional(),
  metadata,
  llmCall: llmCallSchema.optional(),
  error: spanErrorSchema.optional(),
});

const traceErrorSchema = z.object({
  kind: errorKind,
  message: z.string().min(1).max(2000),
  code: z.string().max(120).optional(),
  metadata,
});

export const ingestTraceSchema = z
  .object({
    projectId: z.string().uuid(),
    correlationId: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    status: executionStatus,
    startedAt: isoDateTime,
    endedAt: isoDateTime.optional(),
    metadata,
    spans: z.array(spanSchema).max(500).default([]),
    errors: z.array(traceErrorSchema).max(100).default([]),
  })
  .superRefine((trace, ctx) => {
    const keys = new Set<string>();
    for (const span of trace.spans) {
      if (keys.has(span.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate span key "${span.key}"`,
          path: ['spans'],
        });
      }
      keys.add(span.key);
    }
    // parentKey must reference a span present in the same payload.
    for (const span of trace.spans) {
      if (span.parentKey !== undefined && !keys.has(span.parentKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Span "${span.key}" references unknown parentKey "${span.parentKey}"`,
          path: ['spans'],
        });
      }
      if (span.parentKey === span.key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Span "${span.key}" cannot be its own parent`,
          path: ['spans'],
        });
      }
    }
  });

export type IngestTraceInput = z.infer<typeof ingestTraceSchema>;
export type IngestSpanInput = z.infer<typeof spanSchema>;
