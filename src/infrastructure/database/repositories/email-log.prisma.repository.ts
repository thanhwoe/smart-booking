import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  IEmailLogRepository,
  CreateEmailLogData,
  UpdateEmailLogData,
} from '@domain/email-log/email-log.repository';
import type { EmailLog } from '@domain/email-log/email-log.entity';

@Injectable()
export class EmailLogPrismaRepository implements IEmailLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateEmailLogData): Promise<EmailLog> {
    return this.prisma.emailLog.create({
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        toEmail: data.toEmail,
        subject: data.subject,
        jobName: data.jobName,
        status: data.status,
      },
    });
  }

  update(id: string, data: UpdateEmailLogData): Promise<EmailLog> {
    return this.prisma.emailLog.update({ where: { id }, data });
  }

  updateByResendId(
    resendId: string,
    data: UpdateEmailLogData,
  ): Promise<EmailLog> {
    return this.prisma.emailLog
      .updateMany({
        where: { resendEmailId: resendId },
        data,
      })
      .then(() => {
        return this.prisma.emailLog.findFirst({
          where: { resendEmailId: resendId },
        }) as unknown as EmailLog;
      });
  }
}
