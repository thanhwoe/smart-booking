import { Injectable } from '@nestjs/common';
import { EmailLogsRepository } from './email-logs.repository';
import { EmailSuppressionsRepository } from './email-suppressions.repository';
import { EmailStatus, SuppressionReason } from '@app/generated/prisma/client';
import { CreateEmailLogDto } from './dto/create-email-log.dto';

@Injectable()
export class EmailLogsService {
  constructor(
    private readonly emailLogsRepository: EmailLogsRepository,
    private readonly emailSuppressionsRepository: EmailSuppressionsRepository,
  ) {}

  async create(data: CreateEmailLogDto) {
    return this.emailLogsRepository.create(data);
  }

  async markSent(id: string, resendEmailId: string) {
    return this.emailLogsRepository.update(id, {
      resendEmailId,
      status: EmailStatus.SENT,
      sentAt: new Date(),
    });
  }

  async markFailed(id: string) {
    return this.emailLogsRepository.update(id, {
      status: EmailStatus.FAILED,
    });
  }

  async markDelivered(resendId: string) {
    return this.emailLogsRepository.updateByResendId(resendId, {
      status: EmailStatus.DELIVERED,
      deliveredAt: new Date(),
    });
  }

  async markDeliveryDelayed(resendId: string) {
    return this.emailLogsRepository.updateByResendId(resendId, {
      status: EmailStatus.DELIVERY_DELAYED,
    });
  }

  async markBounced(data: {
    resendId: string;
    toEmail: string;
    bounceReason?: string;
    bounceType: 'hard' | 'soft';
    bounceCode?: string;
  }) {
    await this.emailLogsRepository.updateByResendId(data.resendId, {
      status: EmailStatus.BOUNCED,
      bouncedAt: new Date(),
      bounceReason: data.bounceReason,
      bounceType: data.bounceType,
      bounceCode: data.bounceCode,
    });

    await this.emailSuppressionsRepository.upsert(data.toEmail, {
      reason:
        data.bounceType === 'hard'
          ? SuppressionReason.HARD_BOUNCE
          : SuppressionReason.SOFT_BOUNCE,
      source: 'bounce',
      notes: data.bounceReason ?? null,
    });
  }

  async markComplained(resendId: string, toEmail: string) {
    await this.emailLogsRepository.updateByResendId(resendId, {
      status: EmailStatus.COMPLAINED,
      complainedAt: new Date(),
    });

    await this.emailSuppressionsRepository.upsert(toEmail, {
      reason: SuppressionReason.COMPLAINT,
      source: 'complaint',
      notes: 'User reported as spam',
    });
  }

  async isSuppressed(email: string) {
    const suppression = await this.emailSuppressionsRepository.findOne(email);
    return suppression !== null;
  }
}
