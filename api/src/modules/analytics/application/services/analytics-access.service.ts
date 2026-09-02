import { Injectable } from '@nestjs/common';
import {
  AnalyticsAccessDeniedError,
  AnalyticsProjectNotFoundError,
} from '../../domain/errors/analytics.errors';
import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';

/**
 * Ensures the authenticated user owns the project before any aggregation runs.
 * Shared by all analytics use cases so ownership is enforced consistently.
 */
@Injectable()
export class AnalyticsAccessService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async assertOwnership(projectId: string, userId: string): Promise<void> {
    const ownerId = await this.repository.findProjectOwner(projectId);
    if (ownerId === null) {
      throw new AnalyticsProjectNotFoundError();
    }
    if (ownerId !== userId) {
      throw new AnalyticsAccessDeniedError();
    }
  }
}
