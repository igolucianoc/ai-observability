import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import {
  type CreateRefreshTokenInput,
  RefreshTokenRepository,
  type RefreshTokenRecord,
} from '../../domain/repositories/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const token = await this.prisma.refreshToken.create({ data: input });
    return this.toRecord(token);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return token ? this.toRecord(token) : null;
  }

  async revokeById(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return result.count;
  }

  private toRecord(token: {
    id: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }): RefreshTokenRecord {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
    };
  }
}
