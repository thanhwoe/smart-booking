import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';

import { CreateBookingUseCase } from '@application/booking/use-cases/create-booking.use-case';
import { FindAllBookingsUseCase } from '@application/booking/use-cases/find-all-bookings.use-case';
import { FindBookingUseCase } from '@application/booking/use-cases/find-booking.use-case';
import { CancelBookingUseCase } from '@application/booking/use-cases/cancel-booking.use-case';
import { ConfirmBookingUseCase } from '@application/booking/use-cases/confirm-booking.use-case';
import { RefundBookingUseCase } from '@application/booking/use-cases/refund-booking.use-case';
import { CancelExpiredBookingsUseCase } from '@application/booking/use-cases/cancel-expired-bookings.use-case';

import { CancelExpiredBookingsTask } from './tasks/cancel-expired-bookings.task';

@Module({
  controllers: [BookingsController],
  providers: [
    CreateBookingUseCase,
    FindAllBookingsUseCase,
    FindBookingUseCase,
    CancelBookingUseCase,
    ConfirmBookingUseCase,
    RefundBookingUseCase,
    CancelExpiredBookingsUseCase,
    CancelExpiredBookingsTask,
  ],
  exports: [
    ConfirmBookingUseCase,
    FindBookingUseCase,
    RefundBookingUseCase,
    CancelExpiredBookingsUseCase,
  ],
})
export class BookingsModule {}
