import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from '../webhooks/stripe-webhook.controller';

import { CreateCheckoutUseCase } from '@application/payment/use-cases/create-checkout.use-case';
import { RefundPaymentUseCase } from '@application/payment/use-cases/refund-payment.use-case';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [BookingsModule],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [CreateCheckoutUseCase, RefundPaymentUseCase],
})
export class PaymentsModule {}
