import type { Payment, PaymentStatus } from './payment.entity';
import type { User } from '@domain/user/user.entity';

export type PaymentWithBooking = Payment & {
  booking: {
    user: User;
    slot: {
      service: { name: string };
      provider: { name: string };
      startTime: Date;
      endTime: Date;
    };
  };
};

export type CreatePaymentData = {
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
};

export type UpdatePaymentData = Partial<{
  status: PaymentStatus;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
}>;

export interface IPaymentRepository {
  create(data: CreatePaymentData): Promise<Payment>;
  update(id: string, data: UpdatePaymentData): Promise<Payment>;
  updateByBookingId(
    bookingId: string,
    data: UpdatePaymentData,
  ): Promise<Payment>;
  updateExpired(bookingId: string): Promise<{ count: number }>;
  findOne(id: string): Promise<PaymentWithBooking | null>;
  findByBookingId(bookingId: string): Promise<PaymentWithBooking | null>;
  findByPaymentIntent(
    paymentIntentId: string,
  ): Promise<PaymentWithBooking | null>;
}

export const IPaymentRepository = Symbol('IPaymentRepository');
