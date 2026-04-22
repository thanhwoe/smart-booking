import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const CLERK_CLIENT = Symbol('CLERK_CLIENT');

export const ClerkClientProvider = {
  provide: CLERK_CLIENT,
  useFactory: (configService: ConfigService) => {
    return createClerkClient({
      secretKey: configService.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  },
  inject: [ConfigService],
};
