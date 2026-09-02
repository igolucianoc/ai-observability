import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { EmailAlreadyInUseError } from '../../domain/errors/auth.errors';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { type AuthResult } from '../auth-result';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

@Injectable()
export class RegisterUseCase extends BaseUseCase<RegisterInput, AuthResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {
    super();
  }

  async execute(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.users.create({ email, name: input.name.trim(), passwordHash });

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
