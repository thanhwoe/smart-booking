import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendClient, getResendConfig } from './resend.config';
import { ResendWebhookController } from './webhook.controller';
import { EmailLogsModule } from '@app/modules/email-logs/email-logs.module';
import { ResendWebhookService } from './webhook.service';

@Module({
  imports: [EmailLogsModule],
  providers: [
    {
      provide: ResendClient,
      useFactory: getResendConfig,
      inject: [ConfigService],
    },
    ResendWebhookService,
  ],
  controllers: [ResendWebhookController],
  exports: [ResendClient],
})
export class ResendModule {}
