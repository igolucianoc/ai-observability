import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { type AuthenticatedUser } from '../auth-result';

export interface GetMeInput {
  userId: string;
}

@Injectable()
export class GetMeUseCase extends BaseUseCase<GetMeInput, AuthenticatedUser | null> {
  constructor(private readonly users: UserRepository) {
    super();
  }

  async execute(input: GetMeInput): Promise<AuthenticatedUser | null> {
    const user = await this.users.findById(input.userId);
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  }
}
