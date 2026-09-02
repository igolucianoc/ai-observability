import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { type AuthenticatedRequest } from '../authenticated-user';
import { TokenService } from '@/modules/auth/application/services/token.service';
import { ACCESS_COOKIE } from '@/modules/auth/presentation/cookies';

/**
 * Global authentication guard. Reads the access token from the httpOnly cookie,
 * verifies it, and attaches the user to the request. Routes marked `@Public()`
 * are allowed through without a token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = (request as AuthenticatedRequest & { cookies?: Record<string, string> })
      .cookies;
    const token = cookies?.[ACCESS_COOKIE];

    if (!token) {
      throw new UnauthorizedException({ message: 'Authentication required' });
    }

    try {
      const payload = this.tokens.verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException({ message: 'Invalid or expired session' });
    }
  }
}
