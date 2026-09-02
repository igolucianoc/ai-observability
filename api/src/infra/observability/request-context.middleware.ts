import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';
import { rootLogger, type StructuredLogger } from './logger';

export interface RequestWithContext extends Request {
  requestId?: string;
  log?: StructuredLogger;
  startTime?: number;
}

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a correlation id to every request (accepting an inbound one when
 * present), attaches a child logger, echoes the id back on the response, and
 * records the start time for latency measurement.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const inbound = req.headers[REQUEST_ID_HEADER];
    const requestId = (Array.isArray(inbound) ? inbound[0] : inbound) ?? randomUUID();

    req.requestId = requestId;
    req.startTime = Date.now();
    req.log = rootLogger.child({ requestId });
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
