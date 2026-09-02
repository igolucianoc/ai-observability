import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EnvService } from '@/infra/env/env.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface GeneratedRefreshToken {
  /// Opaque token value handed to the client (in an httpOnly cookie).
  token: string;
  /// SHA-256 hash of the token, safe to persist.
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Issues signed access tokens and opaque refresh tokens. Refresh tokens are
 * random opaque strings (not JWTs) so revocation is authoritative at the store.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly env: EnvService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.env.get('JWT_ACCESS_SECRET'),
      expiresIn: this.env.get('JWT_ACCESS_TTL'),
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, {
      secret: this.env.get('JWT_ACCESS_SECRET'),
    });
  }

  generateRefreshToken(): GeneratedRefreshToken {
    const token = randomBytes(48).toString('base64url');
    const ttlSeconds = this.env.get('JWT_REFRESH_TTL');
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
