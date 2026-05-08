import {
  BadRequestException,
  Inject,
  Injectable,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { Request } from 'express';
import * as Sentry from '@sentry/nestjs';
import { IEmailLogRepository } from '@domain/email-log/email-log.repository';
import { TrackService } from '@infrastructure/tracking/track.service';
import { EmailStatus } from '@domain/email-log/email-log.entity';
import { IEmailSuppressionRepository } from '@domain/email-suppression/email-suppression.repository';
import { SuppressionReason } from '@domain/email-suppression/email-suppression.entity';

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
    @Inject(IEmailLogRepository)
    private readonly emailLogRepository: IEmailLogRepository,
    @Inject(IEmailSuppressionRepository)
    private readonly emailSuppressionRepository: IEmailSuppressionRepository,
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
          await this.emailLogRepository.updateByResendId(emailId, {
            status: EmailStatus.DELIVERED,
            deliveredAt: new Date(),
          });
          break;

        case 'email.delivery_delayed':
          await this.emailLogRepository.updateByResendId(emailId, {
            status: EmailStatus.DELIVERY_DELAYED,
            deliveredAt: new Date(),
          });
          break;

        case 'email.bounced': {
          await this.emailLogRepository.updateByResendId(emailId, {
            status: EmailStatus.BOUNCED,
            bouncedAt: new Date(),
            bounceType: event.data.bounce?.type,
            bounceCode: event.data.bounce?.code,
            bounceReason: event.data.bounce?.message,
          });

          const bounceType = event.data.bounce?.type ?? 'hard';
          const reason =
            bounceType === 'hard'
              ? SuppressionReason.HARD_BOUNCE
              : SuppressionReason.SOFT_BOUNCE;
          await this.emailSuppressionRepository.upsertByEmail({
            email: toEmail,
            data: {
              reason: reason,
              source: 'bounce',
              notes: event.data.bounce?.message ?? null,
            },
          });
          break;
        }

        case 'email.complained': {
          await this.emailLogRepository.updateByResendId(emailId, {
            status: EmailStatus.COMPLAINED,
            complainedAt: new Date(),
          });
          await this.emailSuppressionRepository.upsertByEmail({
            email: toEmail,
            data: {
              reason: SuppressionReason.COMPLAINT,
              source: 'complaint',
              notes: 'User reported as spam',
            },
          });
          break;
        }

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
