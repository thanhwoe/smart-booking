import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  IPaymentRepository,
  PaymentWithBooking,
  CreatePaymentData,
  UpdatePaymentData,
} from '@domain/payment/payment.repository';
import type { Payment } from '@domain/payment/payment.entity';
import { PaymentStatus } from '@domain/payment/payment.entity';

@Injectable()
export class PaymentPrismaRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePaymentData): Promise<Payment> {
    return this.prisma.payment.create({ data });
  }

  update(id: string, data: UpdatePaymentData): Promise<Payment> {
    return this.prisma.payment.update({ where: { id }, data });
  }

  updateByBookingId(
    bookingId: string,
    data: UpdatePaymentData,
  ): Promise<Payment> {
    return this.prisma.payment.update({ where: { bookingId }, data });
  }

  async updateExpired(bookingId: string): Promise<{ count: number }> {
    return this.prisma.payment.updateMany({
      where: { bookingId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED },
    });
  }

  findOne(id: string): Promise<PaymentWithBooking | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: this.include(),
    }) as Promise<PaymentWithBooking | null>;
  }

  findByBookingId(bookingId: string): Promise<PaymentWithBooking | null> {
    return this.prisma.payment.findUnique({
      where: { bookingId },
      include: this.include(),
    }) as Promise<PaymentWithBooking | null>;
  }

  findByPaymentIntent(
    paymentIntentId: string,
  ): Promise<PaymentWithBooking | null> {
    return this.prisma.payment.findUnique({
      where: { stripePaymentIntent: paymentIntentId },
      include: this.include(),
    }) as Promise<PaymentWithBooking | null>;
  }

  private include() {
    return {
      booking: {
        include: {
          user: true,
          slot: {
            select: {
              service: true,
              provider: { select: { name: true } },
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    };
  }
}
