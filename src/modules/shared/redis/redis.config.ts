import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const RedisClient = Symbol('RedisClient');

export const redisFactory = (config: ConfigService) => {
  return new Redis({
    host: config.getOrThrow<string>('REDIS_HOST'),
    port: config.getOrThrow<number>('REDIS_PORT'),

    //   TODO: production
    password: config.get<string>('REDIS_PASSWORD'),
    //   tls: configService.get<boolean>('REDIS_TLS') ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });
};
