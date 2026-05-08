import { Injectable } from '@nestjs/common';
import {
  IEmailSuppressionRepository,
  UpsertByEmailParams,
} from '@domain/email-suppression/email-suppression.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmailSuppression,
  SuppressionReason,
} from '@domain/email-suppression/email-suppression.entity';

@Injectable()
export class EmailSuppressionRepository implements IEmailSuppressionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.emailSuppression.findUnique({ where: { email } });
  }

  async releaseAllExpired({
    releaseTime,
    reason,
  }: {
    releaseTime: Date;
    reason: SuppressionReason;
  }) {
    const result = await this.prisma.emailSuppression.deleteMany({
      where: {
        reason,
        createdAt: { lte: releaseTime },
      },
    });
    return result.count;
  }

  async upsertByEmail({
    email,
    data,
  }: UpsertByEmailParams): Promise<EmailSuppression> {
    return this.prisma.emailSuppression.upsert({
      where: { email },
      update: {
        reason: data.reason,
        source: data.source,
        notes: data.notes,
        updatedAt: new Date(),
      },
      create: {
        email: email,
        reason: data.reason,
        source: data.source,
        notes: data.notes,
      },
    });
  }
}
