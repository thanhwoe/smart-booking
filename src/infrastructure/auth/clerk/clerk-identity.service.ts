import { Inject, Injectable } from '@nestjs/common';
import { IIdentityProvider } from '@application/user/ports/identity.port';
import { CLERK_CLIENT } from './clerk-client.provider';
import type { ClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkIdentityService implements IIdentityProvider {
  constructor(
    @Inject(CLERK_CLIENT)
    private readonly clerkClient: ClerkClient,
  ) {}

  async deleteUser(externalId: string): Promise<void> {
    await this.clerkClient.users.deleteUser(externalId);
  }
}
