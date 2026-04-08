import { Global, Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { PostHogModule } from './posthog/posthog.module';
import { LockModule } from './lock/lock.module';

@Global()
@Module({
  imports: [CacheModule, RedisModule, PostHogModule, LockModule],
  exports: [CacheModule, PostHogModule, LockModule],
})
export class SharedModule {}
