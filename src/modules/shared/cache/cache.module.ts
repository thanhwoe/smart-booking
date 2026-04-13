import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { ICacheService } from '@app/interfaces/cache.interface';

@Module({
  providers: [
    CacheService,
    {
      provide: ICacheService,
      useExisting: CacheService,
    },
  ],
  exports: [ICacheService],
})
export class CacheModule {}
