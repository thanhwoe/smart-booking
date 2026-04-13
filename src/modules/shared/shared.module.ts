import { Global, Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { LockModule } from './lock/lock.module';
import { QueueModule } from './queue/queue.module';
import { TrackModule } from './track/track.module';

@Global()
@Module({
  imports: [CacheModule, RedisModule, LockModule, QueueModule, TrackModule],
  exports: [CacheModule, RedisModule, LockModule, QueueModule, TrackModule],
})
export class SharedModule {}
