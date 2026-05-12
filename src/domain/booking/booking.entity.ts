export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
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
