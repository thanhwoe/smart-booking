import type { BookingWithPayment } from '@domain/booking/booking.repository';
import type { User } from '@domain/user/user.entity';
/**
 * Port: IPaymentGateway
 * Application layer abstraction over any payment processor (Stripe, Paddle, etc.)
 */
export type CheckoutSessionResult = {
  id: string;
  clientSecret: string;
};

export interface IPaymentGateway {
  createCheckoutSession(
    booking: BookingWithPayment,
    user: User,
    successUrl: string,
  ): Promise<CheckoutSessionResult>;
  createRefund(bookingId: string, paymentIntentId: string): Promise<void>;
}

export const IPaymentGateway = Symbol('IPaymentGateway');
