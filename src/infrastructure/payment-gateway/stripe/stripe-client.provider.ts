import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const stripeFactory = (config: ConfigService) => {
  return new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
    apiVersion: '2026-03-25.dahlia',
  });
};
