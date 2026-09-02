-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('SUCCESS', 'ERROR', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "SpanKind" AS ENUM ('LLM', 'RETRIEVAL', 'TOOL', 'EMBEDDING', 'CHAIN');

-- CreateEnum
CREATE TYPE "ErrorKind" AS ENUM ('PROVIDER_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'VALIDATION', 'INTERNAL');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traces" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spans" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "SpanKind" NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_calls" (
    "id" TEXT NOT NULL,
    "spanId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "requestText" TEXT,
    "responseText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "llmCallId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_errors" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanId" TEXT,
    "kind" "ErrorKind" NOT NULL,
    "message" TEXT NOT NULL,
    "code" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trace_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "traces_projectId_startedAt_idx" ON "traces"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "traces_status_idx" ON "traces"("status");

-- CreateIndex
CREATE INDEX "traces_correlationId_idx" ON "traces"("correlationId");

-- CreateIndex
CREATE INDEX "spans_traceId_idx" ON "spans"("traceId");

-- CreateIndex
CREATE INDEX "spans_parentSpanId_idx" ON "spans"("parentSpanId");

-- CreateIndex
CREATE INDEX "spans_kind_idx" ON "spans"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "llm_calls_spanId_key" ON "llm_calls"("spanId");

-- CreateIndex
CREATE INDEX "llm_calls_model_idx" ON "llm_calls"("model");

-- CreateIndex
CREATE INDEX "llm_calls_provider_idx" ON "llm_calls"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "usage_llmCallId_key" ON "usage"("llmCallId");

-- CreateIndex
CREATE INDEX "trace_errors_traceId_idx" ON "trace_errors"("traceId");

-- CreateIndex
CREATE INDEX "trace_errors_kind_idx" ON "trace_errors"("kind");

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "traces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spans" ADD CONSTRAINT "spans_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spans" ADD CONSTRAINT "spans_parentSpanId_fkey" FOREIGN KEY ("parentSpanId") REFERENCES "spans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_spanId_fkey" FOREIGN KEY ("spanId") REFERENCES "spans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_llmCallId_fkey" FOREIGN KEY ("llmCallId") REFERENCES "llm_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_errors" ADD CONSTRAINT "trace_errors_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_errors" ADD CONSTRAINT "trace_errors_spanId_fkey" FOREIGN KEY ("spanId") REFERENCES "spans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
