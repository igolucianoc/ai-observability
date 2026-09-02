import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { Public } from '@/infra/http/public.decorator';
import { ZodValidationPipe } from '@/infra/pipes/zod-validation.pipe';
import { EnvService } from '@/infra/env/env.service';
import { type AuthResult, type AuthenticatedUser } from '../../application/auth-result';
import {
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../../domain/errors/auth.errors';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import {
  type LoginBody,
  type RegisterBody,
  loginSchema,
  registerSchema,
} from '../schemas/auth.schemas';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUseCase,
    private readonly loginUser: LoginUseCase,
    private readonly refreshUser: RefreshTokenUseCase,
    private readonly logoutUser: LogoutUseCase,
    private readonly env: EnvService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(
    @Body() body: RegisterBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<HttpSuccessResponse<AuthenticatedUser>> {
    try {
      const result = await this.registerUser.execute(body);
      this.applyCookies(res, result);
      return ok(result.user, { message: 'Account created' });
    } catch (error) {
      if (error instanceof EmailAlreadyInUseError) {
        throw new ConflictException({ message: error.message });
      }
      throw error;
    }
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<HttpSuccessResponse<AuthenticatedUser>> {
    try {
      const result = await this.loginUser.execute(body);
      this.applyCookies(res, result);
      return ok(result.user, { message: 'Logged in' });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({ message: error.message });
      }
      throw error;
    }
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 900_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<HttpSuccessResponse<AuthenticatedUser>> {
    const refreshToken = this.readRefreshCookie(req);
    if (!refreshToken) {
      clearAuthCookies(res, this.env.get('COOKIE_SECURE'));
      throw new UnauthorizedException({ message: 'Invalid or expired refresh token' });
    }
    try {
      const result = await this.refreshUser.execute({ refreshToken });
      this.applyCookies(res, result);
      return ok(result.user, { message: 'Token refreshed' });
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        clearAuthCookies(res, this.env.get('COOKIE_SECURE'));
        throw new UnauthorizedException({ message: error.message });
      }
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<HttpSuccessResponse<{ loggedOut: true }>> {
    await this.logoutUser.execute({ refreshToken: this.readRefreshCookie(req) });
    clearAuthCookies(res, this.env.get('COOKIE_SECURE'));
    return ok({ loggedOut: true } as const, { message: 'Logged out' });
  }

  private applyCookies(res: Response, result: AuthResult): void {
    setAuthCookies(res, result, {
      secure: this.env.get('COOKIE_SECURE'),
      accessMaxAgeMs: this.env.get('JWT_ACCESS_TTL') * 1000,
    });
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[REFRESH_COOKIE];
  }
}
