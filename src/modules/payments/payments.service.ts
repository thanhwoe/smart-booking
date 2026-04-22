import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { BookingsService } from '../bookings/bookings.service';
import {
  BookingStatus,
  PaymentStatus,
  User,
} from '@app/generated/prisma/client';
import { StripeService } from './stripe/stripe.service';
import { PaymentsRepository } from './payments.repository';
import { QueueService } from '../shared/queue/queue.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly stripeService: StripeService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly queueService: QueueService,
  ) {}

  async createCheckoutSession(
    bookingId: string,
    user: User,
    createCheckoutDto: CreateCheckoutDto,
  ) {
    const booking = await this.bookingsService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== user.id) {
      throw new UnauthorizedException('You can only pay for your own bookings');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be paid');
    }

    if (!booking.payment) {
      throw new BadRequestException(
        'Payment record not found for this booking',
      );
    }

    if (booking.payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('This booking has already been paid');
    }

    const session = await this.stripeService.createSession(
      booking,
      user,
      createCheckoutDto.successUrl,
    );

    if (!session.client_secret) {
      throw new BadRequestException('Stripe did not return a client secret');
    }

    await this.paymentsRepository.update(booking.payment.id, {
      stripeSessionId: session.id,
    });
    return {
      id: session.id,
      clientSecret: session.client_secret,
    };
  }

  async findOne(bookingId: string, user: User) {
    const payment = await this.paymentsRepository.findByBookingId(bookingId);
    if (!payment) {
      throw new NotFoundException('Payment record not found for this booking');
    }
    if (payment.booking.user.id !== user.id) {
      throw new UnauthorizedException('You can only view your own payments');
    }

    return payment;
  }

  async refund(bookingId: string) {
    const payment = await this.paymentsRepository.findByBookingId(bookingId);

    if (!payment) {
      throw new NotFoundException('Payment record not found for this booking');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return payment;
    }
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only PAID payments can be refunded');
    }
    if (!payment.stripePaymentIntent) {
      throw new BadRequestException(
        'No Stripe payment intent on record — cannot refund',
      );
    }
    await this.stripeService.createRefund(
      bookingId,
      payment.stripePaymentIntent,
    );
    const updatedPayment = await this.paymentsRepository.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
    });

    await this.bookingsService.refund(bookingId);

    await this.queueService.dispatchBookingCancelled({
      bookingId,
      userId: payment.booking.user.id,
      userName: payment.booking.user.name,
      userEmail: payment.booking.user.email,
      serviceName: payment.booking.slot.service.name,
      startTime: payment.booking.slot.startTime.toISOString(),
      refunded: true,
    });

    return updatedPayment;
  }
}
