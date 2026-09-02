import { ApplicationError } from '@/core/errors/application.error';

export class AnalyticsProjectNotFoundError extends ApplicationError {
  constructor() {
    super('Project not found');
  }
}

export class AnalyticsAccessDeniedError extends ApplicationError {
  constructor() {
    super('You do not have access to this project');
  }
}
