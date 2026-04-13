import { Module } from '@nestjs/common';
import { RedisClient, redisFactory } from './redis.config';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: RedisClient,
      useFactory: redisFactory,
      inject: [ConfigService],
    },
  ],

  exports: [RedisClient],
})
export class RedisModule {}
