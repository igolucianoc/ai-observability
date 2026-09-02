import { randomUUID } from 'node:crypto';
import {
  type CreateUserInput,
  UserRepository,
  type UserRecord,
} from '../../domain/repositories/user.repository';

export class InMemoryUserRepository extends UserRepository {
  readonly items: UserRecord[] = [];

  create(input: CreateUserInput): Promise<UserRecord> {
    const user: UserRecord = { id: randomUUID(), ...input };
    this.items.push(user);
    return Promise.resolve(user);
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return Promise.resolve(this.items.find((user) => user.email === email) ?? null);
  }

  findById(id: string): Promise<UserRecord | null> {
    return Promise.resolve(this.items.find((user) => user.id === id) ?? null);
  }
}
