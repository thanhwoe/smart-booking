import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

/**
 * Injection token for the Clerk Client
 */
export const CLERK_CLIENT = Symbol('CLERK_CLIENT');

/**
 * Provider for injecting the configured Clerk Client globally
 */
export const ClerkClientProvider = {
  provide: CLERK_CLIENT,
  useFactory: (configService: ConfigService) => {
    return createClerkClient({
      secretKey: configService.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  },
  inject: [ConfigService],
};
