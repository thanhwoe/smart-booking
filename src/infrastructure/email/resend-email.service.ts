import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ResendClient } from './resend/resend.config';
import {
  BookingCancelledPayload,
  BookingConfirmedPayload,
} from '@application/common/ports/queue.port';
import { ConfigService } from '@nestjs/config';
import { TrackService } from '@infrastructure/tracking/track.service';
import { bookingConfirmedTemplate } from './templates/booking-confirm.templates';
import { bookingCancelledTemplate } from './templates/booking-cancelled.templates';
import { JOBS } from '../queue/queue.constants';
import { IEmailLogRepository } from '@domain/email-log/email-log.repository';
import { EmailStatus } from '@app/generated/prisma/client';
import { IEmailSuppressionRepository } from '@app/domain/email-suppression/email-suppression.repository';

@Injectable()
export class ResendEmailService {
  private readonly from: string;

  constructor(
    @Inject(ResendClient)
    private readonly resend: Resend,
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
    @Inject(IEmailLogRepository)
    private readonly emailLogRepository: IEmailLogRepository,
    @Inject(IEmailSuppressionRepository)
    private readonly emailSuppressionRepository: IEmailSuppressionRepository,
  ) {
    this.from = this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');
  }

  async sendBookingConfirmed(data: BookingConfirmedPayload) {
    const { subject, html, text } = bookingConfirmedTemplate(data);
    await this.send({
      html,
      text,
      subject,
      jobName: JOBS.BOOKING_CONFIRMED,
      to: data.userEmail,
      bookingId: data.bookingId,
      userId: data.userId,
    });
  }

  async sendBookingCancelled(data: BookingCancelledPayload) {
    const { subject, html, text } = bookingCancelledTemplate(data);
    await this.send({
      html,
      text,
      subject,
      jobName: JOBS.BOOKING_CANCELLED,
      to: data.userEmail,
      bookingId: data.bookingId,
      userId: data.userId,
    });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    jobName: string;
    bookingId?: string;
    userId?: string;
  }): Promise<void> {
    const suppression = await this.emailSuppressionRepository.findByEmail(
      params.to,
    );

    if (suppression) {
      this.trackService.capture({
        event: 'email_suppressed',
        distinctId: 'system',
        properties: { toEmail: params.to, subject: params.subject },
      });
      return;
    }

    const log = await this.emailLogRepository.create({
      toEmail: params.to,
      subject: params.subject,
      jobName: params.jobName,
      bookingId: params.bookingId,
      userId: params.userId,
      status: EmailStatus.QUEUED,
    });

    const { error, data } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error || !data) {
      await this.emailLogRepository
        .update(log.id, {
          status: EmailStatus.FAILED,
        })
        .catch((e) => {
          this.trackService.capture({
            event: 'email_log_failed',
            distinctId: 'system',
            properties: {
              toEmail: params.to,
              subject: params.subject,
              error: e as Error,
            },
          });
        });

      this.trackService.capture({
        event: 'email_send_failed',
        distinctId: 'system',
        properties: {
          toEmail: params.to,
          subject: params.subject,
          error: error?.message,
        },
      });

      // Re-throw so BullMQ retries the job
      throw new Error(`Resend failed: ${error?.message}`);
    }

    await this.emailLogRepository
      .update(log.id, {
        resendEmailId: data.id,
        status: EmailStatus.SENT,
        sentAt: new Date(),
      })
      .catch((e) => {
        this.trackService.capture({
          event: 'email_log_failed',
          distinctId: 'system',
          properties: {
            toEmail: params.to,
            subject: params.subject,
            error: e as Error,
          },
        });
      });
  }
}
