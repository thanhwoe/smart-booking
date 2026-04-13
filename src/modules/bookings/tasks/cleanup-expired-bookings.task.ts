import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from '../bookings.service';

@Injectable()
export class CleanupExpiredBookingsTask {
  private isRunning = false;
  constructor(private bookingsService: BookingsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCleanup() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      await this.bookingsService.cancelExpired();
    } finally {
      this.isRunning = false;
    }
  }
}
