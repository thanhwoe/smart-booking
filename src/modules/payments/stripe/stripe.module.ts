import { Module } from '@nestjs/common';
import { StripeClientProvider } from './stripe-client.provider';
import { StripeWebhookService } from './webhook.service';
import { StripeWebhookController } from './webhook.controller';
import { PaymentsRepository } from '../payments.repository';
import { StripeEventsRepository } from './stripe-events.repository';
import { StripeService } from './stripe.service';

@Module({
  controllers: [StripeWebhookController],
  providers: [
    StripeClientProvider,
    StripeWebhookService,
    PaymentsRepository,
    StripeEventsRepository,
    StripeService,
  ],
  exports: [StripeService],
})
export class StripeModule {}
