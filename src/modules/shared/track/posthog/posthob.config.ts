import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

export const PostHogClient = Symbol('PostHogClient');

export const postHogFactory = (config: ConfigService) => {
  return new PostHog(config.getOrThrow<string>('POST_HOG_TOKEN'), {
    host: 'https://eu.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
    disabled: true,
  });
};
