import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import {
  ProjectReadRepository,
  type ProjectSummary,
} from '../../domain/repositories/project-read.repository';

@Injectable()
export class ListProjectsUseCase extends BaseUseCase<string, ProjectSummary[]> {
  constructor(private readonly repository: ProjectReadRepository) {
    super();
  }

  execute(ownerId: string): Promise<ProjectSummary[]> {
    return this.repository.listByOwner(ownerId);
  }
}
