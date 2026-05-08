import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  IBookingRepository,
  CreateBookingData,
  BookingWithPayment,
  BookingCanceled,
} from '@domain/booking/booking.repository';
import { BookingStatus, PaymentStatus } from '@domain/booking/booking.entity';
import { SlotStatus } from '@domain/slot/slot.entity';
import { TransactionIsolationLevel } from '@app/generated/prisma/internal/prismaNamespace';
import type { Booking } from '@domain/booking/booking.entity';

@Injectable()
export class BookingPrismaRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBookingData): Promise<BookingWithPayment> {
    return this.prisma.$transaction(
      async (tx) => {
        // Pessimistic row-level lock: SELECT … FOR UPDATE blocks concurrent transactions
        // from modifying the slot row. This is the authoritative overbooking guard.
        const [lockedSlot] = await tx.$queryRaw<
          Array<{
            id: string;
            status: SlotStatus;
            booked_count: number;
            capacity: number;
            price: number;
          }>
        >`
          SELECT s.id, s.status, s.booked_count, s.capacity, sv.price
          FROM slots s
          INNER JOIN services sv ON sv.id = s.service_id
          WHERE s.id = ${data.slotId}
          FOR UPDATE OF s
        `;

        if (!lockedSlot)
          throw new NotFoundException(`Slot with ${data.slotId} not found`);
        if (lockedSlot.status === SlotStatus.CANCELLED)
          throw new ConflictException(`Slot ${data.slotId} is cancelled`);
        if (lockedSlot.booked_count >= lockedSlot.capacity)
          throw new ConflictException(`Slot ${data.slotId} is full`);

        const newBookedCount = lockedSlot.booked_count + 1;

        await tx.slot.update({
          where: { id: data.slotId },
          data: {
            bookedCount: { increment: 1 },
            status:
              newBookedCount >= lockedSlot.capacity
                ? SlotStatus.FULL
                : SlotStatus.AVAILABLE,
          },
        });

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const booking = await tx.booking.create({
          data: {
            userId: data.userId,
            slotId: data.slotId,
            idempotencyKey: data.idempotencyKey,
            status: BookingStatus.PENDING,
            expiresAt,
          },
          include: this.include(),
        });

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: lockedSlot.price ?? 0,
            currency: 'usd',
            status: PaymentStatus.PENDING,
          },
        });

        return booking;
      },
      { isolationLevel: TransactionIsolationLevel.Serializable },
    );
  }

  update(id: string, data: Partial<Booking>): Promise<BookingWithPayment> {
    return this.prisma.booking.update({
      where: { id },
      data,
      include: this.include(),
    });
  }

  delete(id: string): Promise<Booking> {
    return this.prisma.booking.delete({ where: { id } });
  }

  findOne(id: string): Promise<BookingWithPayment | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      include: this.include(),
    }) as Promise<BookingWithPayment | null>;
  }

  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<BookingWithPayment | null> {
    return this.prisma.booking.findUnique({
      where: { idempotencyKey },
      include: this.include(),
    }) as Promise<BookingWithPayment | null>;
  }

  findAll(params?: {
    skip?: number;
    take?: number;
    status?: BookingStatus;
    userId?: string;
    providerId?: string;
  }): Promise<[Booking[], number]> {
    const where = {
      userId: params?.userId,
      status: params?.status,
      slot: { providerId: params?.providerId },
    };
    return this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: params?.skip,
        take: params?.take,
        include: { slot: { include: { service: true } }, payment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]) as Promise<[Booking[], number]>;
  }

  cancel(id: string): Promise<BookingCanceled> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
        select: this.select(),
      });
      await tx.slot.update({
        where: { id: updated.slotId },
        data: { bookedCount: { decrement: 1 }, status: SlotStatus.AVAILABLE },
      });
      return updated;
    }) as Promise<BookingCanceled>;
  }

  cancelExpired(): Promise<BookingCanceled[]> {
    return this.prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: { status: BookingStatus.PENDING, expiresAt: { lt: new Date() } },
        select: this.select(),
      });
      await tx.booking.updateMany({
        where: { id: { in: bookings.map((b) => b.id) } },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      });
      await tx.slot.updateMany({
        where: { id: { in: bookings.map((b) => b.slotId) } },
        data: { bookedCount: { decrement: 1 }, status: SlotStatus.AVAILABLE },
      });
      return bookings;
    }) as Promise<BookingCanceled[]>;
  }

  private include() {
    return {
      slot: {
        include: {
          service: true,
          provider: { select: { id: true, name: true, email: true } },
        },
      },
      payment: true,
    };
  }

  private select() {
    return {
      slotId: true,
      id: true,
      user: { select: { email: true, name: true, id: true } },
      slot: {
        select: {
          service: { select: { name: true } },
          startTime: true,
        },
      },
      payment: { select: { status: true, id: true } },
    };
  }
}
