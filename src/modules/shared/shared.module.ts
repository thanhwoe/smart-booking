import { Global, Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { PostHogModule } from './posthog/posthog.module';

@Global()
@Module({
  imports: [CacheModule, RedisModule, PostHogModule],
  exports: [CacheModule, PostHogModule],
})
export class SharedModule {}
