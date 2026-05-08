import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import { CancelExpiredBookingsUseCase } from '@application/booking/use-cases/cancel-expired-bookings.use-case';

@Injectable()
export class CancelExpiredBookingsTask {
  private readonly logger = new Logger(CancelExpiredBookingsTask.name);
  private isRunning = false;

  constructor(
    private readonly cancelExpiredBookingsUseCase: CancelExpiredBookingsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const cancelled = await this.cancelExpiredBookingsUseCase.execute();
      if (cancelled.length > 0) {
        this.logger.log(`Cancelled ${cancelled.length} expired bookings.`);
      }
    } catch (error) {
      Sentry.captureException(error);
      this.logger.error('Failed to cancel expired bookings', error);
    } finally {
      this.isRunning = false;
    }
  }
}
