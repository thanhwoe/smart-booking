import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog;

  constructor(private configService: ConfigService) {
    this.client = new PostHog(
      configService.getOrThrow<string>('POST_HOG_TOKEN'),
      {
        host: 'https://eu.i.posthog.com',
        flushAt: 1,
        flushInterval: 0,
      },
    );
  }

  error(
    error: Error,
    event: {
      distinctId: string;
      properties?: Record<string, any>;
    },
  ) {
    this.client.captureException(error, event.distinctId, event.properties);
  }

  capture(event: {
    distinctId: string;
    event: string;
    properties?: Record<string, any>;
  }) {
    this.client.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: event.properties,
    });
  }

  identify(userId: string, properties?: Record<string, any>) {
    this.client.identify({
      distinctId: userId,
      properties,
    });
  }

  async onModuleDestroy() {
    await this.client.shutdown();
  }
}
