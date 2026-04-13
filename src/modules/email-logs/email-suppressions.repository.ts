import { PrismaService } from '@app/database/prisma/prisma.service';
import { EmailSuppression } from '@app/generated/prisma/client';
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
}
