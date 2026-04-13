import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ResendClient } from './resend/resend.config';
import {
  BookingCancelledJobPayload,
  BookingConfirmedJobPayload,
} from '@app/interfaces/email-jobs.interface';
import { ConfigService } from '@nestjs/config';
import { TrackService } from '../track/track.service';
import { bookingConfirmedTemplate } from './templates/booking-confirm.templates';
import { bookingCancelledTemplate } from './templates/booking-cancelled.templates';
import { EmailLogsService } from '@app/modules/email-logs/email-logs.service';
import { JOBS } from '../queue/queue.constants';

@Injectable()
export class EmailService {
  private readonly from: string;
  constructor(
    @Inject(ResendClient)
    private readonly resend: Resend,
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
    private readonly emailLogsService: EmailLogsService,
  ) {
    this.from = this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');
  }

  async sendBookingConfirmed(data: BookingConfirmedJobPayload) {
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

  async sendBookingCancelled(data: BookingCancelledJobPayload) {
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
    // Check suppression
    const isSuppressed = await this.emailLogsService.isSuppressed(params.to);
    if (isSuppressed) {
      this.trackService.capture({
        event: 'email_suppressed',
        distinctId: 'system',
        properties: {
          toEmail: params.to,
          subject: params.subject,
        },
      });
      return;
    }

    // Create log
    const log = await this.emailLogsService.create({
      toEmail: params.to,
      subject: params.subject,
      jobName: params.jobName,
      bookingId: params.bookingId,
      userId: params.userId,
    });

    const { error, data } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error || !data) {
      await this.emailLogsService.markFailed(log.id).catch((e) => {
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
          error: error.message,
        },
      });
      // Re-throw so BullMQ retries the job
      throw new Error(`Resend failed: ${error.message}`);
    }

    await this.emailLogsService.markSent(log.id, data.id).catch((e) => {
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
