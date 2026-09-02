import { beforeEach, describe, expect, it } from 'vitest';
import { InvalidCredentialsError } from '../../domain/errors/auth.errors';
import { InMemoryRefreshTokenRepository } from '../../persistence/repositories/in-memory-refresh-token.repository';
import { InMemoryUserRepository } from '../../persistence/repositories/in-memory-user.repository';
import { makeTokenService } from '../../test/make-token-service';
import { PasswordService } from '../services/password.service';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let passwords: PasswordService;
  let login: LoginUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    passwords = new PasswordService();
    login = new LoginUseCase(users, refreshTokens, passwords, makeTokenService());

    await users.create({
      email: 'user@example.com',
      name: 'User',
      passwordHash: await passwords.hash('correct-password'),
    });
  });

  it('rejects an unknown email with a generic error', async () => {
    await expect(
      login.execute({ email: 'nobody@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects a wrong password with a generic error', async () => {
    await expect(
      login.execute({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('issues tokens and persists a refresh token on success', async () => {
    const result = await login.execute({ email: 'user@example.com', password: 'correct-password' });

    expect(result.user.email).toBe('user@example.com');
    expect(result.accessToken).toBeTruthy();
    expect(refreshTokens.items).toHaveLength(1);
    expect(refreshTokens.items[0].revokedAt).toBeNull();
  });
});
