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
import { Public } from '@app/decorators/public.decorator';
import { WebhookService } from './webhook.service';

@ApiExcludeController()
@Controller('auth')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Post('webhook')
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
