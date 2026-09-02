import { beforeEach, describe, expect, it } from 'vitest';
import { EmailAlreadyInUseError } from '../../domain/errors/auth.errors';
import { InMemoryRefreshTokenRepository } from '../../persistence/repositories/in-memory-refresh-token.repository';
import { InMemoryUserRepository } from '../../persistence/repositories/in-memory-user.repository';
import { makeTokenService } from '../../test/make-token-service';
import { PasswordService } from '../services/password.service';
import { RegisterUseCase } from './register.use-case';

describe('RegisterUseCase', () => {
  let users: InMemoryUserRepository;
  let register: RegisterUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    register = new RegisterUseCase(
      users,
      new InMemoryRefreshTokenRepository(),
      new PasswordService(),
      makeTokenService(),
    );
  });

  it('creates a user with a hashed password and normalized email', async () => {
    const result = await register.execute({
      email: '  User@Example.com ',
      name: '  Jane  ',
      password: 'super-secret',
    });

    expect(result.user.email).toBe('user@example.com');
    expect(result.user.name).toBe('Jane');
    expect(users.items[0].passwordHash).not.toBe('super-secret');
  });

  it('rejects a duplicate email', async () => {
    await register.execute({ email: 'dup@example.com', name: 'A', password: 'super-secret' });

    await expect(
      register.execute({ email: 'dup@example.com', name: 'B', password: 'another-secret' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });
});
