import { Global, Module } from '@nestjs/common';
import { ResendEmailService } from './resend-email.service';
import { ResendClient, resendFactory } from './resend/resend.config';
import { ConfigService } from '@nestjs/config';
import { ResendWebhookService } from './resend/webhook.service';

@Global()
@Module({
  providers: [
    ResendEmailService,
    ResendWebhookService,
    {
      provide: ResendClient,
      useFactory: resendFactory,
      inject: [ConfigService],
    },
  ],
  exports: [ResendEmailService, ResendWebhookService],
})
export class EmailModule {}
