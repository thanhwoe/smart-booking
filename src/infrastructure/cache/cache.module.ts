import { Global, Module } from '@nestjs/common';
import { ICacheService } from '@application/common/ports/cache.port';
import { RedisCacheService } from './redis-cache.service';
import { RedisModule } from '@infrastructure/redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: ICacheService,
      useClass: RedisCacheService,
    },
  ],
  exports: [ICacheService],
})
export class CacheModule {}
