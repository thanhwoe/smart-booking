import {
  BookingUpdateInput,
  BookingWhereInput,
} from '@app/generated/prisma/models';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  SlotStatus,
} from '@app/generated/prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/database/prisma/prisma.service';

type CreateBookingData = Pick<Booking, 'slotId' | 'userId' | 'idempotencyKey'>;

interface IBookingRepository {
  create(data: CreateBookingData): Promise<Booking>;
  update(id: string, data: BookingUpdateInput): Promise<Booking>;
  delete(id: string): Promise<Booking>;
  findOne(id: string): Promise<Booking | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Booking | null>;
  findAll(params?: {
    skip: number;
    take: number;
    status?: BookingStatus;
    userId?: string;
  }): Promise<[Booking[], number]>;
  cancel(id: string): Promise<Booking>;
  cancelExpired(): Promise<void>;
}

@Injectable()
export class BookingsRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBookingData) {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: data.slotId },
        include: {
          service: {
            select: {
              price: true,
            },
          },
        },
      });

      if (!slot) {
        throw new NotFoundException(`Slot with ${data.slotId} not found`);
      }

      if (slot.status === SlotStatus.CANCELLED) {
        throw new ConflictException(`Slot ${data.slotId} is cancelled`);
      }

      if (slot.bookedCount >= slot.capacity) {
        throw new ConflictException(`Slot ${data.slotId} is full`);
      }

      // Optimistic update slot
      await tx.slot.update({
        where: { id: data.slotId },
        data: {
          bookedCount: { increment: 1 },
          status:
            slot.bookedCount + 1 >= slot.capacity
              ? SlotStatus.FULL
              : SlotStatus.AVAILABLE,
        },
      });

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create booking
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

      // Create payment
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: slot.service.price ?? 0,
          currency: 'USD',
          status: PaymentStatus.PENDING,
        },
      });

      return booking;
    });
  }

  update(id: string, data: BookingUpdateInput): Promise<Booking> {
    return this.prisma.booking.update({ where: { id }, data });
  }

  delete(id: string): Promise<Booking> {
    return this.prisma.booking.delete({ where: { id } });
  }

  findOne(id: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      include: this.include(),
    });
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({ where: { idempotencyKey } });
  }

  findAll(params?: {
    skip?: number;
    take?: number;
    userId?: string;
    status?: BookingStatus;
  }): Promise<[Booking[], number]> {
    const where: BookingWhereInput = {
      userId: params?.userId,
      status: params?.status,
    };
    return this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: params?.skip,
        take: params?.take,
      }),
      this.prisma.booking.count({
        where,
      }),
    ]);
  }

  cancel(id: string): Promise<Booking> {
    return this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.slot.update({
        where: { id: updatedBooking.slotId },
        data: {
          bookedCount: { decrement: 1 },
          status: SlotStatus.AVAILABLE,
        },
      });

      return updatedBooking;
    });
  }
  cancelExpired(): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: {
          status: BookingStatus.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
        select: {
          slotId: true,
          id: true,
        },
      });

      await tx.booking.updateMany({
        where: {
          id: { in: bookings.map((b) => b.id) },
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.slot.updateMany({
        where: { id: { in: bookings.map((b) => b.slotId) } },
        data: {
          bookedCount: { decrement: 1 },
          status: SlotStatus.AVAILABLE,
        },
      });
    });
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
}
