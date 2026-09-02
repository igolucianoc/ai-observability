import {
  ProjectReadRepository,
  type ProjectSummary,
} from '../../domain/repositories/project-read.repository';

export class InMemoryProjectReadRepository extends ProjectReadRepository {
  readonly items: Array<ProjectSummary & { ownerId: string }> = [];

  listByOwner(ownerId: string): Promise<ProjectSummary[]> {
    const projects = this.items
      .filter((project) => project.ownerId === ownerId)
      .map(({ ownerId: _ownerId, ...summary }) => summary)
      .sort((a, b) => a.name.localeCompare(b.name));
    return Promise.resolve(projects);
  }
}
