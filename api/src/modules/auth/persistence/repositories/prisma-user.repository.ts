import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import {
  type CreateUserInput,
  UserRepository,
  type UserRecord,
} from '../../domain/repositories/user.repository';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await this.prisma.user.create({ data: input });
    return this.toRecord(user);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toRecord(user) : null;
  }

  private toRecord(user: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
  }): UserRecord {
    return { id: user.id, email: user.email, name: user.name, passwordHash: user.passwordHash };
  }
}
