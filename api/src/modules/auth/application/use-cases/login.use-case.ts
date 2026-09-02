import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { InvalidCredentialsError } from '../../domain/errors/auth.errors';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { type AuthResult } from '../auth-result';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';

export interface LoginInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginUseCase extends BaseUseCase<LoginInput, AuthResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {
    super();
  }

  async execute(input: LoginInput): Promise<AuthResult> {
    const email = input.email.toLowerCase().trim();
    const user = await this.users.findByEmail(email);

    // Compare against a found hash, or a throwaway to keep timing consistent
    // whether or not the email exists.
    const passwordHash = user?.passwordHash ?? '';
    const matches = user ? await this.passwords.compare(input.password, passwordHash) : false;

    if (!user || !matches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokens.signAccessToken({ sub: user.id, email: user.email });
    const refresh = this.tokens.generateRefreshToken();
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      familyId: randomUUID(),
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
