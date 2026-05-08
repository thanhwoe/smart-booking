import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { IPaymentRepository } from '@domain/payment/payment.repository';
import { IPaymentGateway } from '@application/payment/ports/payment-gateway.port';
import { FindBookingUseCase } from '@application/booking/use-cases/find-booking.use-case';
import { BookingStatus } from '@domain/booking/booking.entity';
import { PaymentStatus } from '@domain/payment/payment.entity';
import { User } from '@domain/user/user.entity';

export type CreateCheckoutInput = {
  bookingId: string;
  user: User;
  successUrl: string;
};

@Injectable()
export class CreateCheckoutUseCase {
  constructor(
    @Inject(IPaymentRepository)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(IPaymentGateway)
    private readonly paymentGateway: IPaymentGateway,
    private readonly findBookingUseCase: FindBookingUseCase,
  ) {}

  async execute(input: CreateCheckoutInput) {
    const booking = await this.findBookingUseCase.execute(input.bookingId);

    if (booking.userId !== input.user.id) {
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

    const session = await this.paymentGateway.createCheckoutSession(
      booking,
      input.user,
      input.successUrl,
    );

    await this.paymentRepository.update(booking.payment.id, {
      stripeSessionId: session.id,
    });

    return { id: session.id, clientSecret: session.clientSecret };
  }
}
