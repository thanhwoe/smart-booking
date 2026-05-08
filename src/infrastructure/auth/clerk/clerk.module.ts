import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLERK_CLIENT, clerkFactory } from './clerk-client.provider';
import { ClerkIdentityService } from './clerk-identity.service';
import { IIdentityProvider } from '@application/user/ports/identity.port';
import { ClerkWebhookService } from './webhook.service';

@Module({
  providers: [
    {
      provide: CLERK_CLIENT,
      useFactory: clerkFactory,
      inject: [ConfigService],
    },
    {
      provide: IIdentityProvider,
      useClass: ClerkIdentityService,
    },
    ClerkWebhookService,
  ],
  exports: [CLERK_CLIENT, IIdentityProvider, ClerkWebhookService],
})
export class ClerkModule {}
