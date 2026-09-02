import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import {
  ProjectReadRepository,
  type ProjectSummary,
} from '../../domain/repositories/project-read.repository';

@Injectable()
export class PrismaProjectReadRepository extends ProjectReadRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByOwner(ownerId: string): Promise<ProjectSummary[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      createdAt: project.createdAt.toISOString(),
    }));
  }
}
