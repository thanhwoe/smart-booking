import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ClerkJwtStrategy } from './strategies/clerk-jwt.strategy';
import { ClerkModule } from './clerk/clerk.module';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'clerk-jwt' }),
    ClerkModule,
  ],
  providers: [ClerkJwtStrategy],
  exports: [ClerkModule, PassportModule],
})
export class AuthModule {}
