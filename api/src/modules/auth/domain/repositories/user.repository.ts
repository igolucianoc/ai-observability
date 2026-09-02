export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

/**
 * Persistence contract for user accounts.
 */
export abstract class UserRepository {
  abstract create(input: CreateUserInput): Promise<UserRecord>;
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract findById(id: string): Promise<UserRecord | null>;
}
