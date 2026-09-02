import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hashes and verifies passwords with bcrypt. Plaintext is never persisted.
 */
@Injectable()
export class PasswordService {
  hash(plaintext: string): Promise<string> {
    return hash(plaintext, SALT_ROUNDS);
  }

  compare(plaintext: string, passwordHash: string): Promise<boolean> {
    return compare(plaintext, passwordHash);
  }
}
