import { Module } from '@nestjs/common';
import { RedisCacheService } from './redis/redis-cache.service';
import { ICacheService } from '@app/interfaces/cache.interface';

@Module({
  providers: [
    RedisCacheService,
    {
      provide: ICacheService,
      useExisting: RedisCacheService,
    },
  ],
  exports: [ICacheService],
})
export class CacheModule {}
