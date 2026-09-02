export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

/**
 * Persistence contract for rotatable refresh tokens.
 */
export abstract class RefreshTokenRepository {
  abstract create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  abstract findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  abstract revokeById(id: string): Promise<void>;
  /// Revokes every active token in a family — used on logout and reuse detection.
  abstract revokeFamily(familyId: string): Promise<void>;
  /// Deletes tokens that expired before `before`, so revoked/expired rows do not
  /// accumulate. Returns the number removed. Intended for periodic cleanup.
  abstract deleteExpired(before: Date): Promise<number>;
}
