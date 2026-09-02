import {
  Controller,
  ForbiddenException,
  type MessageEvent,
  NotFoundException,
  Query,
  Sse,
} from '@nestjs/common';
import { type Observable, interval, map, merge } from 'rxjs';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ZodValidationPipe } from '@/infra/pipes/zod-validation.pipe';
import { DashboardEventsService } from '../application/dashboard-events.service';
import { type StreamQuery, streamQuerySchema } from './stream-query.schema';

/// Heartbeat keeps proxies from closing an idle connection.
const HEARTBEAT_INTERVAL_MS = 25_000;

@Controller('events')
export class DashboardStreamController {
  constructor(
    private readonly events: DashboardEventsService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse('stream')
  async stream(
    @Query(new ZodValidationPipe(streamQuerySchema)) query: StreamQuery,
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<Observable<MessageEvent>> {
    const project = await this.prisma.project.findUnique({
      where: { id: query.projectId },
      select: { ownerId: true },
    });
    if (!project) {
      throw new NotFoundException({ message: 'Project not found' });
    }
    if (project.ownerId !== current.id) {
      throw new ForbiddenException({ message: 'You do not have access to this project' });
    }

    const heartbeat = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: { at: new Date().toISOString() } })),
    );

    const domainEvents = this.events
      .forProject(query.projectId)
      .pipe(map((event): MessageEvent => ({ type: event.type, data: event })));

    return merge(domainEvents, heartbeat);
  }
}
