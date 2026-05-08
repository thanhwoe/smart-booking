import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import {
  IPaymentGateway,
  CheckoutSessionResult,
} from '@application/payment/ports/payment-gateway.port';
import { STRIPE_CLIENT } from './stripe-client.provider';
import { BookingWithPayment } from '@domain/booking/booking.repository';
import type { User } from '@domain/user/user.entity';

@Injectable()
export class StripeService implements IPaymentGateway {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripeClient: Stripe,
  ) {}

  async createCheckoutSession(
    booking: BookingWithPayment,
    user: User,
    successUrl: string,
  ): Promise<CheckoutSessionResult> {
    // Stripe requires amount to be in cents
    const amount = Math.round(Number(booking.slot.service.price) * 100);

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded_page',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: booking.payment?.currency ?? 'usd',
            product_data: {
              name: booking.slot.service.name,
              metadata: {
                bookingId: booking.id,
              },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      return_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        bookingId: booking.id,
        paymentId: booking.payment?.id ?? '',
        userId: user.id,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return {
      id: session.id,
      clientSecret: session.client_secret as string,
    };
  }

  async createRefund(
    bookingId: string,
    paymentIntentId: string,
  ): Promise<void> {
    await this.stripeClient.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        bookingId,
      },
    });
  }
}
