export type EmailStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'DELIVERY_DELAYED'
  | 'BOUNCED'
  | 'COMPLAINED'
  | 'FAILED';

export const EmailStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  DELIVERY_DELAYED: 'DELIVERY_DELAYED',
  BOUNCED: 'BOUNCED',
  COMPLAINED: 'COMPLAINED',
  FAILED: 'FAILED',
} as const;

export type EmailLog = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  subject: string;
  toEmail: string;
  resendEmailId: string | null;
  bookingId: string | null;
  userId: string | null;
  jobName: string;
  status: EmailStatus;
  bounceType: string | null;
  bounceCode: string | null;
  bounceReason: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
};
