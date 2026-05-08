import {
  Controller,
  Post,
  Headers,
  type RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@presentation/decorators/public.decorator';
import { ClerkWebhookService } from '@infrastructure/auth/clerk/webhook.service';

@ApiExcludeController()
@Controller('webhooks/auth')
export class ClerkWebhookController {
  constructor(private readonly webhookService: ClerkWebhookService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.webhookService.handleWebhook(
      svixId,
      svixTimestamp,
      svixSignature,
      req,
    );
  }
}
