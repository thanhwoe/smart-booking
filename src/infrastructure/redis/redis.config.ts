import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const RedisClient = Symbol('RedisClient');

export const redisFactory = (config: ConfigService) => {
  return new Redis({
    host: config.getOrThrow<string>('REDIS_HOST'),
    port: config.getOrThrow<number>('REDIS_PORT'),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });
};
