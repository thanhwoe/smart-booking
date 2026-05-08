import { ConfigService } from '@nestjs/config';

export const getBullMQConfig = (config: ConfigService) => ({
  connection: {
    host: config.getOrThrow<string>('REDIS_HOST'),
    port: config.getOrThrow<number>('REDIS_PORT'),
  },
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 1000,
    removeOnFail: 3000,
    backoff: 2000,
  },
});
