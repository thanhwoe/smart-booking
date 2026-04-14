import {
  Payment,
  PaymentStatus,
  Service,
  User,
} from '@app/generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma/prisma.service';
import {
  PaymentCreateInput,
  PaymentUpdateInput,
} from '@app/generated/prisma/models';
import { BatchPayload } from '@app/generated/prisma/internal/prismaNamespace';

type PaymentWithBooking = Payment & {
  booking: {
    user: User;
    slot: {
      service: Service;
      provider: {
        name: string;
      };
      startTime: Date;
      endTime: Date;
    };
  };
};

interface IPaymentsRepository {
  create(data: PaymentCreateInput): Promise<Payment>;
  update(id: string, data: PaymentUpdateInput): Promise<Payment>;
  updateByBookingId(
    bookingId: string,
    data: PaymentUpdateInput,
  ): Promise<Payment>;
  updateExpired(bookingId: string): Promise<BatchPayload>;
  findOne(id: string): Promise<PaymentWithBooking | null>;
  findByBookingId(bookingId: string): Promise<PaymentWithBooking | null>;
  findByPaymentIntent(
    paymentIntentId: string,
  ): Promise<PaymentWithBooking | null>;
}

@Injectable()
export class PaymentsRepository implements IPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: PaymentCreateInput): Promise<Payment> {
    return this.prisma.payment.create({
      data,
    });
  }

  update(id: string, data: PaymentUpdateInput): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data,
    });
  }

  updateByBookingId(
    bookingId: string,
    data: PaymentUpdateInput,
  ): Promise<Payment> {
    return this.prisma.payment.update({
      where: { bookingId },
      data,
    });
  }

  updateExpired(bookingId: string): Promise<BatchPayload> {
    return this.prisma.payment.updateMany({
      where: {
        bookingId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });
  }

  findOne(id: string): Promise<PaymentWithBooking | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: this.include(),
    });
  }

  findByBookingId(bookingId: string): Promise<PaymentWithBooking | null> {
    return this.prisma.payment.findUnique({
      where: { bookingId },
      include: this.include(),
    });
  }

  findByPaymentIntent(
    paymentIntentId: string,
  ): Promise<PaymentWithBooking | null> {
    return this.prisma.payment.findUnique({
      where: { stripePaymentIntent: paymentIntentId },
      include: this.include(),
    });
  }

  private include() {
    return {
      booking: {
        include: {
          user: true,
          slot: {
            select: {
              service: true,
              provider: {
                select: { name: true },
              },
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    };
  }
}
