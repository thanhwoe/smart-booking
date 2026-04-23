import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import { EmailSuppressionsRepository } from '../email-suppressions.repository';
import { SuppressionReason } from '@app/generated/prisma/enums';

@Injectable()
export class ReleaseExpiredSuppressionsTask {
  private isRunning = false;
  constructor(
    private readonly emailSuppressionsRepository: EmailSuppressionsRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      const suppressions = await this.emailSuppressionsRepository.findAll({
        releaseTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        reason: SuppressionReason.SOFT_BOUNCE,
      });
      if (suppressions.length === 0) {
        return;
      }
      const ids = suppressions.map((s) => s.id);
      await this.emailSuppressionsRepository.deleteExpired({
        ids,
        reason: SuppressionReason.SOFT_BOUNCE,
      });
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      this.isRunning = false;
    }
  }
}
