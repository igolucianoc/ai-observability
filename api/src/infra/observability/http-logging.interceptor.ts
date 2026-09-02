import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { rootLogger } from './logger';
import { type RequestWithContext } from './request-context.middleware';

/// Maps an HTTP status code to a low-cardinality class label (2xx, 4xx, ...).
function statusClass(status: number): string {
  return `${Math.floor(status / 100)}xx`;
}

/**
 * Emits one structured `http_request` event per request with RED-style fields:
 * method, route template (low cardinality — not the raw URL), status class and
 * duration. This is the aggregate signal for rate/errors/duration without a
 * separate metrics backend. No user data, query values or bodies are logged.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithContext>();
    const res = http.getResponse<Response>();
    const start = req.startTime ?? Date.now();
    const logger = req.log ?? rootLogger;

    // Route template (e.g. /api/traces/:id) keeps cardinality bounded.
    const route = (req.route as { path?: string } | undefined)?.path ?? req.path;

    const log = (status: number): void => {
      logger.info({
        event: 'http_request',
        method: req.method,
        route,
        statusClass: statusClass(status),
        durationMs: Date.now() - start,
      });
    };

    return next.handle().pipe(
      tap({
        next: () => log(res.statusCode),
        error: (err: unknown) => {
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? Number((err as { status: unknown }).status) || 500
              : 500;
          log(status);
        },
      }),
    );
  }
}
