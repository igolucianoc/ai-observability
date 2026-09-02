import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { PasswordService } from './application/services/password.service';
import { TokenService } from './application/services/token.service';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { UserRepository } from './domain/repositories/user.repository';
import { PrismaRefreshTokenRepository } from './persistence/repositories/prisma-refresh-token.repository';
import { PrismaUserRepository } from './persistence/repositories/prisma-user.repository';
import { AuthController } from './presentation/controllers/auth.controller';
import { MeController } from './presentation/controllers/me.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, MeController],
  providers: [
    PasswordService,
    TokenService,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetMeUseCase,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
  ],
  exports: [TokenService],
})
export class AuthModule {}
