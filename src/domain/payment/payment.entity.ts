import { Decimal } from '@prisma/client/runtime/client';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type Payment = {
  id: string;
  bookingId: string;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  amount: Decimal;
  currency: string;
  status: PaymentStatus;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
