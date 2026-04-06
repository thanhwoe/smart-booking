import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { ClerkJwtStrategy } from './strategies/clerk-jwt.strategy';
import { ClerkModule } from './clerk/clerk.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'clerk-jwt' }),
    ClerkModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, ClerkJwtStrategy],
})
export class AuthModule {}
