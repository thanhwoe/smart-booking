import { Inject, Injectable } from '@nestjs/common';
import type { Stripe } from 'stripe';
import { User } from '@app/generated/prisma/client';
import { BookingWithPayment } from '@app/modules/bookings/bookings.repository';
import { STRIPE_CLIENT } from './stripe-client.provider';

@Injectable()
export class StripeService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripeClient: Stripe,
  ) {}

  createSession(booking: BookingWithPayment, user: User, successUrl: string) {
    // Stripe requires amount to be in cents
    const amount = Math.round(Number(booking.slot.service.price) * 100);

    return this.stripeClient.checkout.sessions.create({
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
      // Session expires 30 min
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
  }

  createRefund(bookingId: string, paymentIntent: string) {
    return this.stripeClient.refunds.create({
      payment_intent: paymentIntent,
      reason: 'requested_by_customer',
      metadata: {
        bookingId,
      },
    });
  }
}
