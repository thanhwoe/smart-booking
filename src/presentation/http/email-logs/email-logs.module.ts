import { Module } from '@nestjs/common';
import { EmailLogsController } from './email-logs.controller';
import { ReleaseExpiredSuppressionsTask } from './tasks/release-expired-suppressions.task';
import { ResendWebhookController } from '../webhooks/resend-webhook.controller';

@Module({
  controllers: [EmailLogsController, ResendWebhookController],
  providers: [ReleaseExpiredSuppressionsTask],
})
export class EmailLogsModule {}
