import { Module, Global } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { STRIPE_CLIENT, stripeFactory } from './stripe-client.provider';
import { ConfigService } from '@nestjs/config';
import { StripeWebhookService } from './webhook.service';
import { StripeEventsRepository } from './stripe-events.repository';
import { IPaymentGateway } from '@application/payment/ports/payment-gateway.port';

@Global()
@Module({
  providers: [
    StripeWebhookService,
    StripeEventsRepository,
    {
      provide: STRIPE_CLIENT,
      useFactory: stripeFactory,
      inject: [ConfigService],
    },
    {
      provide: IPaymentGateway,
      useClass: StripeService,
    },
  ],
  exports: [IPaymentGateway, StripeWebhookService],
})
export class StripeModule {}
