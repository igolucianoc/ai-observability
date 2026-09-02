# Observability of the system itself

This document describes how the **API observes itself** — distinct from the AI
traces it ingests as its domain. The two never mix: self-telemetry is written to
stdout as structured logs and is **never** ingested as domain traces, so there
is no observability loop.

## On-call questions this answers

1. Are the API routes responding, and with what latency and error rate?
2. When a request fails, which request was it and what was the outcome?

## What is captured

Every request emits one structured JSON log line (`event: "http_request"`) with:

| Field | Example | Why |
|-------|---------|-----|
| `requestId` | `9f1c…` | Correlation id, also returned in the `x-request-id` response header |
| `method` | `POST` | RED — request identity |
| `route` | `/api/traces/:id` | Route **template**, not the raw URL (bounded cardinality) |
| `statusClass` | `2xx` / `4xx` / `5xx` | RED — errors, as a low-cardinality class |
| `durationMs` | `42` | RED — duration |
| `service`, `level`, `time` | — | Standard envelope on every line |

An inbound `x-request-id` header is honored (for cross-service correlation);
otherwise a new id is generated per request.

## What is NOT captured

- **No secrets or tokens.** `password`, `passwordHash`, `token`, `accessToken`,
  `refreshToken`, `authorization`, `cookie`, `set-cookie` and the JWT secrets are
  redacted by `redact()` before any line is written.
- **No PII in metrics-shaped fields.** User ids, emails, raw URLs and error
  message text are never used as `route`/`statusClass` labels (they would blow up
  cardinality and leak data). User identity, when needed, belongs in a specific
  log event, not in the aggregate `http_request` line.
- **No request or response bodies.** Payloads are not logged.
- **No exact HTTP status as a label** — only the class (`2xx`…), to keep the
  signal aggregatable.

## Why no distributed tracing (OpenTelemetry)

Deliberately omitted. This is a single-service API, and the term "trace" already
means an AI execution in the product domain — emitting OTel spans would both add
little value for one service and invite confusion with domain traces. Structured
logs with a correlation id answer the on-call questions here. If the system grows
into multiple services, OTel auto-instrumentation is the natural next step.

## Avoiding observability loops

The self-observability path is stdout-only. It does not call `POST /api/traces/ingest`,
does not write to the database, and does not subscribe to the SSE stream. Observing
the API therefore produces no domain traffic that would be observed again.

## Configuration

- `LOG_LEVEL` (`debug` | `info` | `warn` | `error`, default `info`) controls the
  minimum level written.
