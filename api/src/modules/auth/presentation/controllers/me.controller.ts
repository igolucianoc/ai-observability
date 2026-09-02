import { Controller, Get, NotFoundException } from '@nestjs/common';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { type AuthenticatedUser } from '../../application/auth-result';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';

@Controller('auth')
export class MeController {
  constructor(private readonly getMe: GetMeUseCase) {}

  @Get('me')
  async handle(
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<AuthenticatedUser>> {
    const user = await this.getMe.execute({ userId: current.id });
    if (!user) {
      throw new NotFoundException({ message: 'User not found' });
    }
    return ok(user);
  }
}
