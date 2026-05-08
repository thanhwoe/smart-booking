import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

export const CLERK_CLIENT = Symbol('CLERK_CLIENT');

export const clerkFactory = (config: ConfigService) => {
  return createClerkClient({
    secretKey: config.getOrThrow<string>('CLERK_SECRET_KEY'),
  });
};
