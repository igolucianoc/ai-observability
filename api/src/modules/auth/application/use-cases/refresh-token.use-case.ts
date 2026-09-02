import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { InvalidRefreshTokenError } from '../../domain/errors/auth.errors';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { type AuthResult } from '../auth-result';
import { TokenService } from '../services/token.service';

export interface RefreshTokenInput {
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase extends BaseUseCase<RefreshTokenInput, AuthResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
  ) {
    super();
  }

  async execute(input: RefreshTokenInput): Promise<AuthResult> {
    const tokenHash = this.tokens.hashRefreshToken(input.refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored) {
      throw new InvalidRefreshTokenError();
    }

    // Reuse detection: a token presented after being revoked/rotated signals
    // theft. Kill the whole family so the attacker and victim are both logged out.
    if (stored.revokedAt !== null) {
      await this.refreshTokens.revokeFamily(stored.familyId);
      throw new InvalidRefreshTokenError();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    // Rotate: revoke the presented token and issue a fresh one in the same family.
    await this.refreshTokens.revokeById(stored.id);

    const accessToken = this.tokens.signAccessToken({ sub: user.id, email: user.email });
    const refresh = this.tokens.generateRefreshToken();
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      familyId: stored.familyId,
      expiresAt: refresh.expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }
}
