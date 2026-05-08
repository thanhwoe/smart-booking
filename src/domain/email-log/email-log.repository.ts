import type { EmailLog, EmailStatus } from './email-log.entity';

export type CreateEmailLogData = {
  bookingId?: string | null;
  userId?: string | null;
  toEmail: string;
  subject: string;
  jobName: string;
  status?: EmailStatus;
};

export type UpdateEmailLogData = Partial<{
  resendEmailId: string | null;
  status: EmailStatus;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  bounceType: string | null;
  bounceCode: string | null;
  bounceReason: string | null;
}>;

export interface IEmailLogRepository {
  create(data: CreateEmailLogData): Promise<EmailLog>;
  update(id: string, data: UpdateEmailLogData): Promise<EmailLog>;
  updateByResendId(
    resendId: string,
    data: UpdateEmailLogData,
  ): Promise<EmailLog>;
}

export const IEmailLogRepository = Symbol('IEmailLogRepository');
