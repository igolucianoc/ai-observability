import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedRequestUser;
}

/**
 * Injects the authenticated user attached by the JWT guard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without authentication');
    }
    return request.user;
  },
);
