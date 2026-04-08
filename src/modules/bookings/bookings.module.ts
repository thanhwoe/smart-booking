import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsRepository } from './bookings.repository';
import { SlotsModule } from '../slots/slots.module';
import { CleanupExpiredBookingsTask } from './tasks/cleanup-expired-bookings.task';

@Module({
  imports: [SlotsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository, CleanupExpiredBookingsTask],
})
export class BookingsModule {}
