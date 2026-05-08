import { Inject, Injectable } from '@nestjs/common';
import {
  IBookingRepository,
  BookingWithPayment,
} from '@domain/booking/booking.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';
import { BookingNotFoundError } from '@domain/booking/booking.errors';

@Injectable()
export class FindBookingUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
    @Inject(ICacheService)
    private readonly cacheService: ICacheService,
  ) {}

  async execute(id: string): Promise<BookingWithPayment> {
    return this.cacheService.wrap(
      CACHE_KEY.BOOKING_BY_ID(id),
      CACHE_TTL.BOOKING,
      async () => {
        const booking = await this.bookingRepository.findOne(id);
        if (!booking) {
          throw new BookingNotFoundError(id);
        }
        return booking;
      },
    );
  }
}
