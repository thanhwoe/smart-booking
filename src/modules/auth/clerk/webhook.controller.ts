import {
  Controller,
  Post,
  Headers,
  type RawBodyRequest,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Webhook } from 'svix';
import { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { UsersService } from '@app/modules/users/users.service';
import { Public } from '@app/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { PostHogService } from '@app/modules/shared/posthog/posthog.service';

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_numbers: Array<{ phone_number: string }>;
}

@ApiExcludeController()
@Controller('auth')
export class WebhookController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly postHogService: PostHogService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.getOrThrow<string>(
      'CLERK_WEBHOOK_SECRET',
    );

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing svix headers');
    }

    // Verify payload signature using svix
    const wh = new Webhook(webhookSecret);
    let event: { type: string; data: ClerkUserData };

    try {
      const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
      event = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as typeof event;
    } catch (err) {
      this.postHogService.capture({
        event: 'webhook_signature_verification_failed',
        distinctId: 'system',
        properties: {
          error: err as Error,
        },
      });
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(event.data);
        break;
      default:
        this.postHogService.capture({
          event: 'webhook_unhandled_event',
          distinctId: 'system',
          properties: {
            eventType: event.type,
          },
        });
    }

    return { received: true };
  }

  private extractUserInfo(data: ClerkUserData) {
    const email =
      data.email_addresses.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ??
      data.email_addresses[0]?.email_address ??
      '';

    const phone = data.phone_numbers[0]?.phone_number ?? null;
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || email;
    return {
      email,
      phone,
      name,
    };
  }

  private async handleUserCreated(data: ClerkUserData) {
    const { email, phone, name } = this.extractUserInfo(data);

    await this.usersService.syncClerkUser({
      clerkId: data.id,
      email,
      name,
      phone,
    });

    this.postHogService.capture({
      event: 'user_created',
      distinctId: data.id,
      properties: {
        email,
        name,
        phone,
      },
    });
  }

  private async handleUserUpdated(data: ClerkUserData) {
    const { email, phone, name } = this.extractUserInfo(data);

    await this.usersService.syncClerkUser({
      clerkId: data.id,
      email,
      name,
      phone,
    });

    this.postHogService.capture({
      event: 'user_updated',
      distinctId: data.id,
      properties: {
        email,
        name,
        phone,
      },
    });
  }

  private async handleUserDeleted(data: ClerkUserData) {
    await this.usersService.deleteByClerkId(data.id);

    this.postHogService.capture({
      event: 'user_deleted',
      distinctId: data.id,
    });
  }
}
