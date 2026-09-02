import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { hash } from 'bcrypt';
import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { UserRepository } from '@/modules/auth/domain/repositories/user.repository';
import { RefreshTokenRepository } from '@/modules/auth/domain/repositories/refresh-token.repository';
import { InMemoryUserRepository } from '@/modules/auth/persistence/repositories/in-memory-user.repository';
import { InMemoryRefreshTokenRepository } from '@/modules/auth/persistence/repositories/in-memory-refresh-token.repository';
import { AnalyticsRepository } from '@/modules/analytics/domain/repositories/analytics.repository';
import { InMemoryAnalyticsRepository } from '@/modules/analytics/persistence/repositories/in-memory-analytics.repository';
import { ProjectReadRepository } from '@/modules/projects/domain/repositories/project-read.repository';
import { InMemoryProjectReadRepository } from '@/modules/projects/persistence/repositories/in-memory-project-read.repository';
import { TraceIngestionRepository } from '@/modules/tracing/domain/repositories/trace-ingestion.repository';
import { TraceReadRepository } from '@/modules/tracing/domain/repositories/trace-read.repository';
import { InMemoryTraceIngestionRepository } from '@/modules/tracing/persistence/repositories/in-memory-trace-ingestion.repository';
import { InMemoryTraceReadRepository } from '@/modules/tracing/persistence/repositories/in-memory-trace-read.repository';

export interface E2EContext {
  app: INestApplication;
  users: InMemoryUserRepository;
  projects: InMemoryProjectReadRepository;
  analytics: InMemoryAnalyticsRepository;
  ingestion: InMemoryTraceIngestionRepository;
  traceRead: InMemoryTraceReadRepository;
  /// Seeds a user and returns credentials plus the created id.
  seedUser: (email: string, password: string) => Promise<string>;
  /// Registers a project across every in-memory repository that needs it.
  seedProject: (ownerId: string) => string;
}

/// Minimal PrismaService stand-in: only project.findUnique is used at runtime
/// (by the SSE controller for ownership) and it reads the in-memory projects.
function makePrismaFake(projects: InMemoryProjectReadRepository): Partial<PrismaService> {
  return {
    project: {
      findUnique: ({ where }: { where: { id: string } }) => {
        const found = projects.items.find((p) => p.id === where.id);
        return Promise.resolve(found ? { ownerId: found.ownerId } : null);
      },
    } as unknown as PrismaService['project'],
  };
}

export async function createE2EApp(): Promise<E2EContext> {
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const analytics = new InMemoryAnalyticsRepository();
  const projects = new InMemoryProjectReadRepository();
  const ingestion = new InMemoryTraceIngestionRepository();
  const traceRead = new InMemoryTraceReadRepository();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(UserRepository)
    .useValue(users)
    .overrideProvider(RefreshTokenRepository)
    .useValue(refreshTokens)
    .overrideProvider(AnalyticsRepository)
    .useValue(analytics)
    .overrideProvider(ProjectReadRepository)
    .useValue(projects)
    .overrideProvider(TraceIngestionRepository)
    .useValue(ingestion)
    .overrideProvider(TraceReadRepository)
    .useValue(traceRead)
    .overrideProvider(PrismaService)
    .useValue(makePrismaFake(projects))
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.init();

  const seedUser = async (email: string, password: string): Promise<string> => {
    const user = await users.create({ email, name: email, passwordHash: await hash(password, 4) });
    return user.id;
  };

  const seedProject = (ownerId: string): string => {
    const id = randomUUID();
    const summary = {
      id,
      name: `Project ${id.slice(0, 4)}`,
      slug: id,
      createdAt: new Date().toISOString(),
    };
    projects.items.push({ ...summary, ownerId });
    analytics.projects.push({ id, ownerId });
    ingestion.projects.push({ id, ownerId });
    traceRead.projects.push({ id, ownerId });
    return id;
  };

  return { app, users, projects, analytics, ingestion, traceRead, seedUser, seedProject };
}
