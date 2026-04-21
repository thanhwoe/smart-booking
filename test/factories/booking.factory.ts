import {
  Booking,
  BookingStatus,
  PaymentStatus,
} from '@app/generated/prisma/client';
import { TestPrismaService } from '../setup/test-prisma.service';
import { randomUUID } from 'crypto';

export interface CreateTestBookingOptions {
  userId: string;
  slotId: string;
  status?: BookingStatus;
  idempotencyKey?: string;
  expiresAt?: Date;
  createPayment?: boolean;
  paymentAmount?: number;
}

export async function createTestBooking(
  prisma: TestPrismaService,
  options: CreateTestBookingOptions,
): Promise<Booking> {
  const booking = await prisma.booking.create({
    data: {
      userId: options.userId,
      slotId: options.slotId,
      status: options.status ?? BookingStatus.PENDING,
      idempotencyKey: options.idempotencyKey ?? randomUUID(),
      expiresAt: options.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  if (options.createPayment !== false) {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: options.paymentAmount ?? 50.0,
        currency: 'usd',
        status: PaymentStatus.PENDING,
      },
    });
  }

  // Increment slot booked count
  await prisma.slot.update({
    where: { id: options.slotId },
    data: { bookedCount: { increment: 1 } },
  });

  return booking;
}
