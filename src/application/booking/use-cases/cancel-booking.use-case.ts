import { Inject, Injectable } from '@nestjs/common';
import {
  IBookingRepository,
  BookingCanceled,
} from '@domain/booking/booking.repository';
import { BookingStatus } from '@domain/booking/booking.entity';
import { UserRole } from '@domain/user/user.entity';
import { IQueueService } from '@application/common/ports/queue.port';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import { FindBookingUseCase } from './find-booking.use-case';
import {
  BookingAlreadyCancelledError,
  BookingCannotCancelNoOwnError,
  BookingCannotCancelRefundedError,
} from '@app/domain/booking/booking.errors';

export type CancelBookingInput = {
  id: string;
  userId: string;
  userRole: UserRole;
};

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
    @Inject(IQueueService)
    private readonly queueService: IQueueService,
    @Inject(ICacheService)
    private readonly cacheService: ICacheService,
    private readonly findBookingUseCase: FindBookingUseCase,
  ) {}

  async execute(input: CancelBookingInput): Promise<BookingCanceled> {
    const booking = await this.findBookingUseCase.execute(input.id);

    if (input.userRole !== UserRole.ADMIN && booking.userId !== input.userId) {
      throw new BookingCannotCancelNoOwnError();
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BookingAlreadyCancelledError();
    }

    if (booking.status === BookingStatus.REFUNDED) {
      throw new BookingCannotCancelRefundedError();
    }

    const canceledBooking = await this.bookingRepository.cancel(input.id);

    await this.cacheService.del(CACHE_KEY.BOOKING_BY_ID(input.id));

    await this.queueService.dispatchBookingCancelled({
      bookingId: canceledBooking.id,
      userEmail: canceledBooking.user.email,
      userName: canceledBooking.user.name,
      serviceName: canceledBooking.slot.service.name,
      startTime: canceledBooking.slot.startTime.toISOString(),
      refunded: false,
      userId: canceledBooking.user.id,
    });

    return canceledBooking;
  }
}
