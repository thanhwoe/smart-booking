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
