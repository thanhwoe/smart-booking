import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from '../bookings.service';
import * as Sentry from '@sentry/nestjs';

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
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      this.isRunning = false;
    }
  }
}
