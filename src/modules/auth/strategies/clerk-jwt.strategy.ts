import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { UsersService } from '@app/modules/users/users.service';
import { ConfigService } from '@nestjs/config';
import { verifyToken, type ClerkClient } from '@clerk/backend';
import { CLERK_CLIENT } from '../clerk/clerk-client.provider';
import { ExtractJwt } from 'passport-jwt';

export interface ClerkJwtPayload {
  sub: string;
  sid: string;
  iss: string;
  exp: number;
  iat: number;
}

@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, 'clerk-jwt') {
  constructor(
    @Inject(CLERK_CLIENT)
    private readonly clerkClient: ClerkClient,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async validate(req: Request) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const payload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow<string>('CLERK_SECRET_KEY'),
      });
      const clerkUser = await this.clerkClient.users.getUser(payload.sub);

      const user = await this.usersService.findByClerkId(clerkUser.id);
      if (!user) {
        throw new UnauthorizedException(
          'User not found — ensure Clerk webhook has synced this user',
        );
      }

      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired Clerk token');
    }
  }
}
