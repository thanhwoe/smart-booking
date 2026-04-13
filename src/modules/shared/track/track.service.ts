import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PostHogClient } from './posthog/posthob.config';
import { PostHog } from 'posthog-node';

@Injectable()
export class TrackService implements OnModuleDestroy {
  constructor(
    @Inject(PostHogClient)
    private readonly postHogClient: PostHog,
  ) {}

  error(
    error: Error,
    event: {
      distinctId: string;
      properties?: Record<string, any>;
    },
  ) {
    this.postHogClient.captureException(
      error,
      event.distinctId,
      event.properties,
    );
  }

  capture(event: {
    distinctId: string;
    event: string;
    properties?: Record<string, any>;
  }) {
    this.postHogClient.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: event.properties,
    });
  }

  async onModuleDestroy() {
    await this.postHogClient.shutdown();
  }
}
