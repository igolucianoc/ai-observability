import { beforeEach, describe, expect, it } from 'vitest';
import { InvalidRefreshTokenError } from '../../domain/errors/auth.errors';
import { InMemoryRefreshTokenRepository } from '../../persistence/repositories/in-memory-refresh-token.repository';
import { InMemoryUserRepository } from '../../persistence/repositories/in-memory-user.repository';
import { makeTokenService } from '../../test/make-token-service';
import { PasswordService } from '../services/password.service';
import { LoginUseCase } from './login.use-case';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let login: LoginUseCase;
  let refresh: RefreshTokenUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    const passwords = new PasswordService();
    const tokens = makeTokenService();
    login = new LoginUseCase(users, refreshTokens, passwords, tokens);
    refresh = new RefreshTokenUseCase(users, refreshTokens, tokens);

    await users.create({
      email: 'user@example.com',
      name: 'User',
      passwordHash: await passwords.hash('correct-password'),
    });
  });

  it('rotates the token: old one is revoked and a new one is issued in the same family', async () => {
    const session = await login.execute({ email: 'user@example.com', password: 'correct-password' });
    const originalFamily = refreshTokens.items[0].familyId;

    const rotated = await refresh.execute({ refreshToken: session.refreshToken });

    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(refreshTokens.items).toHaveLength(2);
    const [oldToken, newToken] = refreshTokens.items;
    expect(oldToken.revokedAt).not.toBeNull();
    expect(newToken.revokedAt).toBeNull();
    expect(newToken.familyId).toBe(originalFamily);
  });

  it('rejects an unknown refresh token', async () => {
    await expect(refresh.execute({ refreshToken: 'not-a-real-token' })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it('detects reuse: replaying a rotated token revokes the whole family', async () => {
    const session = await login.execute({ email: 'user@example.com', password: 'correct-password' });
    // First rotation consumes the original token.
    await refresh.execute({ refreshToken: session.refreshToken });

    // Replaying the already-rotated token is a theft signal.
    await expect(refresh.execute({ refreshToken: session.refreshToken })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    // Every token in the family is now revoked.
    expect(refreshTokens.items.every((token) => token.revokedAt !== null)).toBe(true);
  });
});
