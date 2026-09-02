import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/// Credenciais da conta demo semeada. O seed cria apenas a estrutura base
/// (usuário + projetos); todos os dados de observabilidade (traces, spans,
/// chamadas de LLM, uso e erros) são capturados a partir do uso real do
/// mini chat, nunca gerados aqui.
const DEMO_USER = {
  email: 'demo@ai-observability.dev',
  name: 'Demo User',
  password: 'demo-password-123',
};

const PROJECT_SPECS = [
  { name: 'Customer Support Bot', slug: 'customer-support-bot' },
  { name: 'Docs Search RAG', slug: 'docs-search-rag' },
  { name: 'Marketing Copilot', slug: 'marketing-copilot' },
];

async function main(): Promise<void> {
  // Estado limpo e idempotente. Removemos qualquer observabilidade previamente
  // existente para que o dashboard reflita somente uso real do mini chat.
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

  for (const spec of PROJECT_SPECS) {
    await prisma.project.create({ data: { ...spec, ownerId: owner.id } });
  }

  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    traces: await prisma.trace.count(),
  };

  console.log('Seed complete (structure only):', counts);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
