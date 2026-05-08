import { Module } from '@nestjs/common';
import { PostHogClient, postHogFactory } from './posthog.config';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: PostHogClient,
      useFactory: postHogFactory,
      inject: [ConfigService],
    },
  ],
  exports: [PostHogClient],
})
export class PostHogModule {}
