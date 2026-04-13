import { ConfigService } from '@nestjs/config';

export const getBullMQConfig = (config: ConfigService) => ({
  connection: {
    host: config.getOrThrow<string>('REDIS_HOST'),
    port: config.getOrThrow<number>('REDIS_PORT'),
  },
  defaultJobOptions: {
    attempts: 3, // Max number of attempts for failed jobs
    removeOnComplete: 1000, // Keep data for the last 1000 completed jobs
    removeOnFail: 3000, // Keep data for the last 3000 failed jobs
    backoff: 2000, // Wait at least 2 seconds before attempting the job again, after failure
  },
});
