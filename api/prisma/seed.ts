import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import {
  type ErrorKind,
  type ExecutionStatus,
  PrismaClient,
  type SpanKind,
} from '@prisma/client';

const prisma = new PrismaClient();

/// Demo credentials for the seeded portfolio account. Synthetic only.
const DEMO_USER = {
  email: 'demo@ai-observability.dev',
  name: 'Demo User',
  password: 'demo-password-123',
};

/**
 * Approximate USD price per 1M tokens per model, used to estimate call cost
 * from token usage. Values are illustrative and synthetic.
 */
const MODEL_PRICING: Record<string, { promptPerM: number; completionPerM: number }> = {
  'gpt-4o': { promptPerM: 2.5, completionPerM: 10 },
  'gpt-4o-mini': { promptPerM: 0.15, completionPerM: 0.6 },
  'claude-3-5-sonnet': { promptPerM: 3, completionPerM: 15 },
  'gemini-1.5-pro': { promptPerM: 1.25, completionPerM: 5 },
};

const MODELS = Object.keys(MODEL_PRICING);

const PROVIDER_BY_MODEL: Record<string, string> = {
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'claude-3-5-sonnet': 'anthropic',
  'gemini-1.5-pro': 'google',
};

type Scenario = 'success' | 'timeout' | 'provider_error' | 'high_cost' | 'high_latency';

const SCENARIOS: Scenario[] = [
  'success',
  'timeout',
  'provider_error',
  'high_cost',
  'high_latency',
];

interface ScenarioShape {
  status: ExecutionStatus;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
  error?: { kind: ErrorKind; message: string; code?: string };
}

function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { promptPerM: 1, completionPerM: 2 };
  const cost =
    (promptTokens / 1_000_000) * pricing.promptPerM +
    (completionTokens / 1_000_000) * pricing.completionPerM;
  return Number(cost.toFixed(6));
}

function buildScenario(scenario: Scenario): ScenarioShape {
  const model = faker.helpers.arrayElement(MODELS);

  switch (scenario) {
    case 'success':
      return {
        status: 'SUCCESS',
        latencyMs: faker.number.int({ min: 200, max: 1800 }),
        promptTokens: faker.number.int({ min: 200, max: 1500 }),
        completionTokens: faker.number.int({ min: 100, max: 900 }),
        model,
      };
    case 'timeout':
      return {
        status: 'TIMEOUT',
        latencyMs: faker.number.int({ min: 30_000, max: 60_000 }),
        promptTokens: faker.number.int({ min: 200, max: 1200 }),
        completionTokens: 0,
        model,
        error: { kind: 'TIMEOUT', message: 'Provider call exceeded the request timeout' },
      };
    case 'provider_error':
      return {
        status: 'ERROR',
        latencyMs: faker.number.int({ min: 100, max: 900 }),
        promptTokens: faker.number.int({ min: 100, max: 800 }),
        completionTokens: 0,
        model,
        error: {
          kind: 'PROVIDER_ERROR',
          message: 'Upstream provider returned an unexpected error',
          code: faker.helpers.arrayElement(['500', '502', '503']),
        },
      };
    case 'high_cost':
      return {
        status: 'SUCCESS',
        latencyMs: faker.number.int({ min: 2000, max: 8000 }),
        promptTokens: faker.number.int({ min: 40_000, max: 120_000 }),
        completionTokens: faker.number.int({ min: 8000, max: 30_000 }),
        model: faker.helpers.arrayElement(['gpt-4o', 'claude-3-5-sonnet']),
      };
    case 'high_latency':
      return {
        status: 'SUCCESS',
        latencyMs: faker.number.int({ min: 12_000, max: 28_000 }),
        promptTokens: faker.number.int({ min: 500, max: 3000 }),
        completionTokens: faker.number.int({ min: 500, max: 2500 }),
        model,
      };
  }
}

async function seedTrace(projectId: string, scenario: Scenario): Promise<void> {
  const shape = buildScenario(scenario);
  const startedAt = faker.date.recent({ days: 14 });
  const endedAt = new Date(startedAt.getTime() + shape.latencyMs);
  const totalTokens = shape.promptTokens + shape.completionTokens;
  const costUsd = estimateCostUsd(shape.model, shape.promptTokens, shape.completionTokens);

  const trace = await prisma.trace.create({
    data: {
      projectId,
      correlationId: faker.string.uuid(),
      name: faker.helpers.arrayElement([
        'chat-completion',
        'rag-query',
        'summarization',
        'agent-run',
      ]),
      status: shape.status,
      startedAt,
      endedAt,
      durationMs: shape.latencyMs,
      totalTokens,
      totalCostUsd: costUsd,
      metadata: { scenario, environment: 'demo' },
    },
  });

  // Retrieval span (context gathering) for RAG-like flows.
  const retrievalSpan = await prisma.span.create({
    data: {
      traceId: trace.id,
      name: 'retrieve-context',
      kind: 'RETRIEVAL' satisfies SpanKind,
      status: 'SUCCESS',
      startedAt,
      endedAt: new Date(startedAt.getTime() + Math.min(300, shape.latencyMs)),
      durationMs: Math.min(300, shape.latencyMs),
    },
  });

  // The LLM span carries the actual model call.
  const llmSpan = await prisma.span.create({
    data: {
      traceId: trace.id,
      parentSpanId: retrievalSpan.id,
      name: 'llm-call',
      kind: 'LLM' satisfies SpanKind,
      status: shape.status,
      startedAt,
      endedAt,
      durationMs: shape.latencyMs,
    },
  });

  const llmCall = await prisma.llmCall.create({
    data: {
      spanId: llmSpan.id,
      provider: PROVIDER_BY_MODEL[shape.model] ?? 'openai',
      model: shape.model,
      temperature: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      latencyMs: shape.latencyMs,
      costUsd,
      requestText: faker.lorem.sentence(),
      responseText: shape.status === 'SUCCESS' ? faker.lorem.paragraph() : null,
    },
  });

  await prisma.usage.create({
    data: {
      llmCallId: llmCall.id,
      promptTokens: shape.promptTokens,
      completionTokens: shape.completionTokens,
      totalTokens,
    },
  });

  if (shape.error) {
    await prisma.traceError.create({
      data: {
        traceId: trace.id,
        spanId: llmSpan.id,
        kind: shape.error.kind,
        message: shape.error.message,
        code: shape.error.code ?? null,
        metadata: { provider: PROVIDER_BY_MODEL[shape.model] ?? 'openai' },
      },
    });
  }
}

async function main(): Promise<void> {
  // Deterministic data across runs.
  faker.seed(42);

  // Clean slate so the seed is idempotent.
  await prisma.traceError.deleteMany();
  await prisma.usage.deleteMany();
  await prisma.llmCall.deleteMany();
  await prisma.span.deleteMany();
  await prisma.trace.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const owner = await prisma.user.create({
    data: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash: await hash(DEMO_USER.password, 12),
    },
  });

  const projectSpecs = [
    { name: 'Customer Support Bot', slug: 'customer-support-bot' },
    { name: 'Docs Search RAG', slug: 'docs-search-rag' },
    { name: 'Marketing Copilot', slug: 'marketing-copilot' },
  ];

  for (const spec of projectSpecs) {
    const project = await prisma.project.create({ data: { ...spec, ownerId: owner.id } });

    // ~40 traces per project, cycling through every scenario so each outcome is
    // well represented for analytics.
    for (let i = 0; i < 40; i += 1) {
      const scenario = SCENARIOS[i % SCENARIOS.length];
      await seedTrace(project.id, scenario);
    }
  }

  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    traces: await prisma.trace.count(),
    spans: await prisma.span.count(),
    llmCalls: await prisma.llmCall.count(),
    usage: await prisma.usage.count(),
    errors: await prisma.traceError.count(),
  };

  console.log('Seed complete:', counts);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
