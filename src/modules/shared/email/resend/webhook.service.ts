import { EmailLogsService } from '@app/modules/email-logs/email-logs.service';
import {
  BadRequestException,
  Injectable,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrackService } from '../../track/track.service';
import { Webhook } from 'svix';
import { Request } from 'express';
import * as Sentry from '@sentry/nestjs';

interface ResendWebhookEvent {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.bounced'
    | 'email.complained'
    | 'email.opened'
    | 'email.clicked';
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    bounce?: {
      type: 'hard' | 'soft';
      code?: string;
      message?: string;
    };
  };
}

@Injectable()
export class ResendWebhookService {
  constructor(
    private readonly emailLogsService: EmailLogsService,
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
  ) {}

  async handleWebhook(
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
    req: RawBodyRequest<Request>,
  ) {
    const secret = this.configService.getOrThrow<string>(
      'RESEND_WEBHOOK_SECRET',
    );
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing Svix signature headers');
    }

    let event: ResendWebhookEvent;
    try {
      const wh = new Webhook(secret);
      const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
      event = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ResendWebhookEvent;
    } catch (err) {
      Sentry.captureException(err);
      this.trackService.capture({
        distinctId: 'system',
        event: 'resend_webhook_signature_verification_failed',
        properties: {
          error: err as Error,
        },
      });
      throw new BadRequestException('Invalid webhook signature');
    }

    this.trackService.capture({
      distinctId: 'system',
      event: 'resend_webhook_received',
      properties: {
        type: event.type,
        emailId: event.data.email_id,
      },
    });

    await this.processEvent(event);

    return { received: true };
  }

  private async processEvent(event: ResendWebhookEvent): Promise<void> {
    const emailId = event.data.email_id;
    const toEmail = event.data.to?.[0] ?? '';

    try {
      switch (event.type) {
        case 'email.sent':
          // Already marked SENT when Resend API returned 200 — no-op
          break;

        case 'email.delivered':
          await this.emailLogsService.markDelivered(emailId);
          break;

        case 'email.delivery_delayed':
          await this.emailLogsService.markDeliveryDelayed(emailId);
          break;

        case 'email.bounced':
          await this.emailLogsService.markBounced({
            bounceType: event.data.bounce?.type ?? 'hard',
            bounceCode: event.data.bounce?.code,
            bounceReason: event.data.bounce?.message,
            resendId: emailId,
            toEmail,
          });
          break;

        case 'email.complained':
          await this.emailLogsService.markComplained(emailId, toEmail);
          break;

        default:
          this.trackService.capture({
            distinctId: 'system',
            event: 'resend_webhook_unhandled',
            properties: {
              type: event.type,
              emailId: event.data.email_id,
            },
          });
      }
    } catch (err) {
      Sentry.captureException(err);
      this.trackService.capture({
        distinctId: 'system',
        event: 'resend_webhook_error',
        properties: {
          type: event.type,
          emailId: event.data.email_id,
          error: err as Error,
        },
      });
    }
  }
}
