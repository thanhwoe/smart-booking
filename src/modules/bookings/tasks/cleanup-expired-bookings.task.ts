import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from '../bookings.service';

@Injectable()
export class CleanupExpiredBookingsTask {
  constructor(private bookingsService: BookingsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCleanup() {
    await this.bookingsService.cancelExpired();
  }
}
