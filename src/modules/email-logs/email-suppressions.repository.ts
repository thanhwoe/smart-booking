import { PrismaService } from '@app/database/prisma/prisma.service';
import {
  EmailSuppression,
  SuppressionReason,
} from '@app/generated/prisma/client';
import { BatchPayload } from '@app/generated/prisma/internal/prismaNamespace';
import { Injectable } from '@nestjs/common';

type EmailSuppressionUpsertInput = Pick<
  EmailSuppression,
  'reason' | 'source' | 'notes'
>;

interface IEmailSuppressionsRepository {
  findOne(email: string): Promise<EmailSuppression | null>;
  upsert(
    email: string,
    data: EmailSuppressionUpsertInput,
  ): Promise<EmailSuppression>;
  delete(email: string): Promise<EmailSuppression>;
  findAll({
    reason,
    releaseTime,
  }: {
    reason?: SuppressionReason;
    releaseTime?: Date;
  }): Promise<EmailSuppression[]>;
  deleteExpired({
    ids,
    reason,
  }: {
    ids: string[];
    reason: SuppressionReason;
  }): Promise<BatchPayload>;
}

@Injectable()
export class EmailSuppressionsRepository implements IEmailSuppressionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOne(email: string): Promise<EmailSuppression | null> {
    return this.prisma.emailSuppression.findUnique({
      where: { email },
    });
  }

  upsert(
    email: string,
    data: EmailSuppressionUpsertInput,
  ): Promise<EmailSuppression> {
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

  delete(email: string): Promise<EmailSuppression> {
    return this.prisma.emailSuppression.delete({
      where: { email },
    });
  }

  findAll({
    reason,
    releaseTime,
  }: {
    reason?: SuppressionReason;
    releaseTime?: Date;
  }): Promise<EmailSuppression[]> {
    return this.prisma.emailSuppression.findMany({
      where: {
        reason,
        createdAt: releaseTime ? { lte: releaseTime } : undefined,
      },
    });
  }

  deleteExpired({
    ids,
    reason,
  }: {
    ids: string[];
    reason: SuppressionReason;
  }): Promise<BatchPayload> {
    return this.prisma.emailSuppression.deleteMany({
      where: {
        id: { in: ids },
        reason,
      },
    });
  }
}
