import { randomUUID } from 'node:crypto';
import {
  type CreateRefreshTokenInput,
  RefreshTokenRepository,
  type RefreshTokenRecord,
} from '../../domain/repositories/refresh-token.repository';

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
  readonly items: RefreshTokenRecord[] = [];

  create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const token: RefreshTokenRecord = { id: randomUUID(), revokedAt: null, ...input };
    this.items.push(token);
    return Promise.resolve(token);
  }

  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return Promise.resolve(this.items.find((token) => token.tokenHash === tokenHash) ?? null);
  }

  revokeById(id: string): Promise<void> {
    const token = this.items.find((item) => item.id === id);
    if (token && token.revokedAt === null) {
      token.revokedAt = new Date();
    }
    return Promise.resolve();
  }

  revokeFamily(familyId: string): Promise<void> {
    for (const token of this.items) {
      if (token.familyId === familyId && token.revokedAt === null) {
        token.revokedAt = new Date();
      }
    }
    return Promise.resolve();
  }
}
