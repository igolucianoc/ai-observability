import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { TokenService } from '../services/token.service';

export interface LogoutInput {
  refreshToken?: string;
}

/**
 * Revokes the whole refresh-token family for the presented token. Idempotent:
 * an unknown or missing token is treated as already logged out.
 */
@Injectable()
export class LogoutUseCase extends BaseUseCase<LogoutInput, void> {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
  ) {
    super();
  }

  async execute(input: LogoutInput): Promise<void> {
    if (!input.refreshToken) {
      return;
    }
    const stored = await this.refreshTokens.findByHash(
      this.tokens.hashRefreshToken(input.refreshToken),
    );
    if (stored) {
      await this.refreshTokens.revokeFamily(stored.familyId);
    }
  }
}
