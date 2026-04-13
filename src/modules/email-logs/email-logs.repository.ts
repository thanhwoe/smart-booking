import { PrismaService } from '@app/database/prisma/prisma.service';
import { EmailLog } from '@app/generated/prisma/client';
import { BatchPayload } from '@app/generated/prisma/internal/prismaNamespace';
import {
  EmailLogCreateInput,
  EmailLogUpdateInput,
} from '@app/generated/prisma/models';
import { Injectable } from '@nestjs/common';

interface IEmailLogsRepository {
  create(data: EmailLogCreateInput): Promise<EmailLog>;
  update(id: string, data: EmailLogUpdateInput): Promise<EmailLog>;
  updateByResendId(
    resendId: string,
    data: EmailLogUpdateInput,
  ): Promise<BatchPayload>;
}

@Injectable()
export class EmailLogsRepository implements IEmailLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: EmailLogCreateInput): Promise<EmailLog> {
    return this.prisma.emailLog.create({ data });
  }

  update(id: string, data: EmailLogUpdateInput): Promise<EmailLog> {
    return this.prisma.emailLog.update({
      where: { id },
      data,
    });
  }

  updateByResendId(
    resendId: string,
    data: EmailLogUpdateInput,
  ): Promise<BatchPayload> {
    return this.prisma.emailLog.updateMany({
      where: { resendEmailId: resendId },
      data,
    });
  }
}
