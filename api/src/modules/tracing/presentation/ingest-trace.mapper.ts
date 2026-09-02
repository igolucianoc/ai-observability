import { type IngestTraceCommand } from '../domain/repositories/trace-ingestion.repository';
import { type IngestTraceInput } from './schemas/ingest-trace.schema';

/**
 * Converts the validated HTTP payload into a domain command, parsing ISO date
 * strings into Date instances. Cost is intentionally not carried over — it is
 * computed server-side during ingestion.
 */
export function toIngestTraceCommand(input: IngestTraceInput): IngestTraceCommand {
  return {
    projectId: input.projectId,
    correlationId: input.correlationId,
    name: input.name,
    status: input.status,
    startedAt: new Date(input.startedAt),
    endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
    metadata: input.metadata,
    spans: input.spans.map((span) => ({
      key: span.key,
      parentKey: span.parentKey,
      name: span.name,
      kind: span.kind,
      status: span.status,
      startedAt: new Date(span.startedAt),
      endedAt: span.endedAt ? new Date(span.endedAt) : undefined,
      metadata: span.metadata,
      llmCall: span.llmCall
        ? {
            provider: span.llmCall.provider,
            model: span.llmCall.model,
            temperature: span.llmCall.temperature,
            latencyMs: span.llmCall.latencyMs,
            requestText: span.llmCall.requestText,
            responseText: span.llmCall.responseText,
            usage: span.llmCall.usage
              ? {
                  promptTokens: span.llmCall.usage.promptTokens,
                  completionTokens: span.llmCall.usage.completionTokens,
                }
              : undefined,
          }
        : undefined,
      error: span.error,
    })),
    errors: input.errors,
  };
}
