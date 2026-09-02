import { ApplicationError } from '@/core/errors/application.error';

/// Raised when the target project does not exist.
export class ProjectNotFoundError extends ApplicationError {
  constructor() {
    super('Project not found');
  }
}

/// Raised when the authenticated user does not own the target project.
export class ProjectAccessDeniedError extends ApplicationError {
  constructor() {
    super('You do not have access to this project');
  }
}
