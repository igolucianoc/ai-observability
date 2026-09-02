export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

/**
 * Read-only access to a user's projects.
 */
export abstract class ProjectReadRepository {
  abstract listByOwner(ownerId: string): Promise<ProjectSummary[]>;
}
