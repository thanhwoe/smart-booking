import { Inject, Injectable } from '@nestjs/common';
import {
  IBookingRepository,
  BookingCanceled,
} from '@domain/booking/booking.repository';
import { IQueueService } from '@application/common/ports/queue.port';

@Injectable()
export class CancelExpiredBookingsUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
    @Inject(IQueueService)
    private readonly queueService: IQueueService,
  ) {}

  async execute(): Promise<BookingCanceled[]> {
    const bookings = await this.bookingRepository.cancelExpired();

    for (const booking of bookings) {
      await this.queueService.dispatchBookingCancelled({
        bookingId: booking.id,
        userEmail: booking.user.email,
        userName: booking.user.name,
        serviceName: booking.slot.service.name,
        startTime: booking.slot.startTime.toISOString(),
        refunded: false,
        userId: booking.user.id,
      });
    }

    return bookings;
  }
}
