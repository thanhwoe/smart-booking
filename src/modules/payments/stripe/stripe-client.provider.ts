import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const StripeClientProvider = {
  provide: STRIPE_CLIENT,
  useFactory: (configService: ConfigService) => {
    return new Stripe(configService.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
      telemetry: false,
    });
  },
  inject: [ConfigService],
};
