import { Injectable } from '@nestjs/common';
import { type Observable, Subject, filter, map } from 'rxjs';

export interface TraceIngestedEvent {
  type: 'trace.ingested';
  projectId: string;
  traceId: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  totalTokens: number;
  totalCostUsd: string;
  at: string;
}

export type DashboardEvent = TraceIngestedEvent;

/**
 * In-process pub/sub for dashboard events. Producers (e.g. ingestion) publish
 * here; the SSE endpoint subscribes and streams events for a single project.
 */
@Injectable()
export class DashboardEventsService {
  private readonly stream = new Subject<DashboardEvent>();

  publish(event: DashboardEvent): void {
    this.stream.next(event);
  }

  /// Emits only the events belonging to the given project.
  forProject(projectId: string): Observable<DashboardEvent> {
    return this.stream.asObservable().pipe(filter((event) => event.projectId === projectId));
  }

  /// Raw stream, mainly for tests.
  asObservable(): Observable<DashboardEvent> {
    return this.stream.asObservable().pipe(map((event) => event));
  }
}
