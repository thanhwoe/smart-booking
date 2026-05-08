import { Decimal } from '@prisma/client/runtime/client';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = 'PENDING' | 'REFUNDED' | 'FAILED' | 'PAID';

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type Booking = {
  id: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  slotId: string;
  idempotencyKey: string;
  expiresAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
};

export type Payment = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  bookingId: string;
  status: PaymentStatus;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  amount: Decimal;
  currency: string;
  paidAt: Date | null;
  refundedAt: Date | null;
};

export type Service = {
  name: string;
  id: string;
  description: string | null;
  durationMinutes: number;
  price: Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
