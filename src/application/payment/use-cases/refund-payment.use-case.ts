import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPaymentRepository } from '@domain/payment/payment.repository';
import { IPaymentGateway } from '@application/payment/ports/payment-gateway.port';
import { IQueueService } from '@application/common/ports/queue.port';
import { RefundBookingUseCase } from '@application/booking/use-cases/refund-booking.use-case';
import { PaymentStatus } from '@domain/payment/payment.entity';
import type { User } from '@domain/user/user.entity';

@Injectable()
export class RefundPaymentUseCase {
  constructor(
    @Inject(IPaymentRepository)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(IPaymentGateway)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(IQueueService)
    private readonly queueService: IQueueService,
    private readonly refundBookingUseCase: RefundBookingUseCase,
  ) {}

  async execute(bookingId: string) {
    const payment = await this.paymentRepository.findByBookingId(bookingId);
    if (!payment)
      throw new NotFoundException('Payment record not found for this booking');

    if (payment.status === PaymentStatus.REFUNDED) return payment;
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only PAID payments can be refunded');
    }
    if (!payment.stripePaymentIntent) {
      throw new BadRequestException(
        'No Stripe payment intent on record — cannot refund',
      );
    }

    await this.paymentGateway.createRefund(
      bookingId,
      payment.stripePaymentIntent,
    );

    const updatedPayment = await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
    });

    await this.refundBookingUseCase.execute(bookingId);

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

  async findOne(bookingId: string, user: User) {
    const payment = await this.paymentRepository.findByBookingId(bookingId);
    if (!payment)
      throw new NotFoundException('Payment record not found for this booking');
    if (payment.booking.user.id !== user.id) {
      throw new BadRequestException('You can only view your own payments');
    }
    return payment;
  }
}
