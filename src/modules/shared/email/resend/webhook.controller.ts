import {
  Controller,
  Post,
  Headers,
  Req,
  type RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@app/decorators/public.decorator';
import { ResendWebhookService } from './webhook.service';

/**
 * ResendWebhookController
 *
 * Receives delivery status events from Resend and updates EmailLog +
 * EmailSuppression accordingly.
 *
 * Security: Resend signs webhooks using Svix. Verify with RESEND_WEBHOOK_SECRET.
 *
 * Setup in Resend Dashboard:
 *   Webhooks → Add endpoint → https://yourdomain.com/email/webhook
 *   Subscribe to: email.sent, email.delivered, email.delivery_delayed,
 *                 email.bounced, email.complained, email.opened, email.clicked
 */
@ApiExcludeController()
@Controller('email')
export class ResendWebhookController {
  constructor(private readonly resendWebhookService: ResendWebhookService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.resendWebhookService.handleWebhook(
      svixId,
      svixTimestamp,
      svixSignature,
      req,
    );
  }
}
