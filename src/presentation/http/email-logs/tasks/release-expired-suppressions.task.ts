import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import { SuppressionReason } from '@domain/email-suppression/email-suppression.entity';
import { IEmailSuppressionRepository } from '@domain/email-suppression/email-suppression.repository';

@Injectable()
export class ReleaseExpiredSuppressionsTask {
  private isRunning = false;
  constructor(
    @Inject(IEmailSuppressionRepository)
    private readonly emailSuppressionRepository: IEmailSuppressionRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const releaseTime = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      await this.emailSuppressionRepository.releaseAllExpired({
        reason: SuppressionReason.SOFT_BOUNCE,
        releaseTime,
      });
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      this.isRunning = false;
    }
  }
}
