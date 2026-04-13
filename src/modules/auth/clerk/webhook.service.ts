import {
  BadRequestException,
  Injectable,
  type RawBodyRequest,
} from '@nestjs/common';
import { UsersService } from '@app/modules/users/users.service';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { Request } from 'express';
import { TrackService } from '@app/modules/shared/track/track.service';

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_numbers: Array<{ phone_number: string }>;
}

@Injectable()
export class WebhookService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
  ) {}

  async handleWebhook(
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
    req: RawBodyRequest<Request>,
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
      this.trackService.capture({
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
        this.trackService.capture({
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

    this.trackService.capture({
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

    this.trackService.capture({
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

    this.trackService.capture({
      event: 'user_deleted',
      distinctId: data.id,
    });
  }
}
