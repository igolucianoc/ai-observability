import { z } from 'zod';
import { apiGet, apiRequest, toQueryString } from './api-client';
import type {
  AuthenticatedUser,
  ModelBreakdownItem,
  OverviewMetrics,
  ProjectSummary,
  TimeseriesPoint,
  TraceDetail,
  TraceExplanation,
  TraceListPage,
} from '@/types/analytics';

const executionStatus = z.enum(['SUCCESS', 'ERROR', 'TIMEOUT']);
const spanKind = z.enum(['LLM', 'RETRIEVAL', 'TOOL', 'EMBEDDING', 'CHAIN']);
const errorKind = z.enum(['PROVIDER_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'VALIDATION', 'INTERNAL']);

const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
});

const overviewSchema = z.object({
  totalRequests: z.number(),
  totalTokens: z.number(),
  totalCostUsd: z.string(),
  avgLatencyMs: z.number(),
  p95LatencyMs: z.number(),
  errorRate: z.number(),
});

const modelBreakdownSchema = z.array(
  z.object({
    model: z.string(),
    requests: z.number(),
    totalTokens: z.number(),
    totalCostUsd: z.string(),
    avgLatencyMs: z.number(),
  }),
);

const timeseriesSchema = z.array(
  z.object({
    bucket: z.string(),
    requests: z.number(),
    totalTokens: z.number(),
    totalCostUsd: z.string(),
    errorCount: z.number(),
  }),
);

const traceListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  correlationId: z.string(),
  status: executionStatus,
  startedAt: z.string(),
  durationMs: z.number().nullable(),
  totalTokens: z.number(),
  totalCostUsd: z.string(),
});

const usageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

const llmCallSchema = z.object({
  provider: z.string(),
  model: z.string(),
  temperature: z.number().nullable(),
  latencyMs: z.number().nullable(),
  costUsd: z.string(),
  requestText: z.string().nullable(),
  responseText: z.string().nullable(),
  usage: usageSchema.nullable(),
});

const traceDetailSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  correlationId: z.string(),
  status: executionStatus,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  totalTokens: z.number(),
  totalCostUsd: z.string(),
  spans: z.array(
    z.object({
      id: z.string(),
      parentSpanId: z.string().nullable(),
      name: z.string(),
      kind: spanKind,
      status: executionStatus,
      startedAt: z.string(),
      endedAt: z.string().nullable(),
      durationMs: z.number().nullable(),
      llmCall: llmCallSchema.nullable(),
    }),
  ),
  errors: z.array(
    z.object({
      kind: errorKind,
      message: z.string(),
      code: z.string().nullable(),
      spanId: z.string().nullable(),
    }),
  ),
});

const paginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const traceExplanationSchema = z.object({
  traceId: z.string(),
  explanation: z.string(),
  provider: z.string(),
});

const chatReplySchema = z.object({
  traceId: z.string(),
  status: executionStatus,
  reply: z.string().nullable(),
  model: z.string(),
  provider: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  latencyMs: z.number(),
});

export type ChatReply = z.infer<typeof chatReplySchema>;

const chatModelsSchema = z.object({
  models: z.array(z.string()),
  default: z.string(),
});

export type ChatModelsInfo = z.infer<typeof chatModelsSchema>;

const clearDataSchema = z.object({
  deletedTraces: z.number(),
});

export type ClearDataResult = z.infer<typeof clearDataSchema>;

export interface AnalyticsFilterParams {
  projectId: string;
  from?: string;
  to?: string;
  model?: string;
}

export interface TraceListParams extends AnalyticsFilterParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const api = {
  login(email: string, password: string): Promise<AuthenticatedUser> {
    return apiRequest('/auth/login', authenticatedUserSchema, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((r) => r.data);
  },

  logout(): Promise<void> {
    return apiRequest('/auth/logout', z.object({ loggedOut: z.boolean() }), {
      method: 'POST',
    }).then(() => undefined);
  },

  me(): Promise<AuthenticatedUser> {
    return apiGet('/auth/me', authenticatedUserSchema);
  },

  listProjects(): Promise<ProjectSummary[]> {
    return apiGet('/projects', z.array(projectSchema));
  },

  overview(params: AnalyticsFilterParams): Promise<OverviewMetrics> {
    return apiGet(`/analytics/overview${toQueryString({ ...params })}`, overviewSchema);
  },

  models(params: AnalyticsFilterParams): Promise<ModelBreakdownItem[]> {
    return apiGet(`/analytics/models${toQueryString({ ...params })}`, modelBreakdownSchema);
  },

  timeseries(params: AnalyticsFilterParams & { bucket?: string }): Promise<TimeseriesPoint[]> {
    return apiGet(`/analytics/timeseries${toQueryString({ ...params })}`, timeseriesSchema);
  },

  async listTraces(params: TraceListParams): Promise<TraceListPage> {
    const { data, meta } = await apiRequest(
      `/traces${toQueryString({ ...params })}`,
      z.array(traceListItemSchema),
    );
    return { items: data, meta: paginationMetaSchema.parse(meta) };
  },

  traceDetail(id: string): Promise<TraceDetail> {
    return apiGet(`/traces/${encodeURIComponent(id)}`, traceDetailSchema);
  },

  explainTrace(id: string): Promise<TraceExplanation> {
    return apiRequest(`/insights/traces/${encodeURIComponent(id)}/explain`, traceExplanationSchema, {
      method: 'POST',
    }).then((r) => r.data);
  },

  chatModels(): Promise<ChatModelsInfo> {
    return apiGet('/ai/models', chatModelsSchema);
  },

  chat(projectId: string, message: string, model?: string): Promise<ChatReply> {
    return apiRequest('/ai/chat', chatReplySchema, {
      method: 'POST',
      body: JSON.stringify({ projectId, message, model }),
    }).then((r) => r.data);
  },

  clearData(): Promise<ClearDataResult> {
    return apiRequest('/analytics/data', clearDataSchema, {
      method: 'DELETE',
    }).then((r) => r.data);
  },
};
