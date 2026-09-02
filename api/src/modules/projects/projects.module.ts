import { Module } from '@nestjs/common';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { ProjectReadRepository } from './domain/repositories/project-read.repository';
import { PrismaProjectReadRepository } from './persistence/repositories/prisma-project-read.repository';
import { ListProjectsController } from './presentation/controllers/list-projects.controller';

@Module({
  controllers: [ListProjectsController],
  providers: [
    ListProjectsUseCase,
    { provide: ProjectReadRepository, useClass: PrismaProjectReadRepository },
  ],
})
export class ProjectsModule {}
