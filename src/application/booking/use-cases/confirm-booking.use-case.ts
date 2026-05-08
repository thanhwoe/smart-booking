import { Inject, Injectable } from '@nestjs/common';
import {
  IBookingRepository,
  BookingWithPayment,
} from '@domain/booking/booking.repository';
import { BookingStatus } from '@domain/booking/booking.entity';
import { PaymentStatus } from '@domain/payment/payment.entity';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import { FindBookingUseCase } from './find-booking.use-case';
import {
  BookingConfirmNotPaidError,
  BookingConfirmNotPendingError,
} from '@app/domain/booking/booking.errors';

@Injectable()
export class ConfirmBookingUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
    @Inject(ICacheService)
    private readonly cacheService: ICacheService,
    private readonly findBookingUseCase: FindBookingUseCase,
  ) {}

  async execute(id: string): Promise<BookingWithPayment> {
    const booking = await this.findBookingUseCase.execute(id);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BookingConfirmNotPendingError();
    }
    if (booking.payment?.status !== PaymentStatus.PAID) {
      throw new BookingConfirmNotPaidError();
    }

    const updated = await this.bookingRepository.update(id, {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    await this.cacheService.del(CACHE_KEY.BOOKING_BY_ID(id));

    return updated;
  }
}
