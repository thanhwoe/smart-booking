import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  ConflictException,
} from '@nestjs/common';
import Redlock, { CompatibleRedisClient, Lock } from 'redlock';
import type Redis from 'ioredis';
import { RedisClient } from '../redis/redis.config';
import { ConfigService } from '@nestjs/config';
import { PostHogService } from '../posthog/posthog.service';

@Injectable()
export class DistributedLockService implements OnModuleInit {
  private readonly logger = new Logger(DistributedLockService.name);

  private redlock: Redlock;

  constructor(
    @Inject(RedisClient)
    private readonly redisClient: Redis,
    private readonly configService: ConfigService,
    private readonly postHogService: PostHogService,
  ) {}

  onModuleInit() {
    this.redlock = new Redlock(
      [this.redisClient as unknown as CompatibleRedisClient],
      {
        retryCount: this.configService.get<number>('LOCK_RETRY_COUNT'),
        retryDelay: this.configService.get<number>('LOCK_RETRY_DELAY'),
        retryJitter: 100,
        driftFactor: 0.01,
      },
    );

    this.redlock.on('clientError', (error: Error) => {
      if (!error.message.includes('The operation was unable to achieve')) {
        this.postHogService.capture({
          distinctId: 'system',
          event: 'lock_error',
          properties: {
            error,
          },
        });
      }
    });

    this.logger.log('Redlock initialized');
  }

  async withLock<T>(
    id: string,
    fn: () => Promise<T>,
    prefix?: string,
    ttlMs: number = this.configService.get<number>('LOCK_DEFAULT_TTL') ?? 5000,
  ): Promise<T> {
    const resource = this.buildKey(id, prefix);
    let lock: Lock;

    try {
      lock = await this.redlock.acquire([resource], ttlMs);
      this.logger.debug(`Lock acquired: ${resource}`);
    } catch {
      throw new ConflictException(
        `Resource ${prefix} ${id} is being processed by another user. Please try again.`,
      );
    }

    try {
      return await fn();
    } finally {
      try {
        await lock.unlock();
        this.postHogService.capture({
          distinctId: 'system',
          event: 'lock_released',
          properties: {
            resource,
          },
        });
        this.logger.debug(`Lock released: ${resource}`);
      } catch (error) {
        this.postHogService.capture({
          distinctId: 'system',
          event: 'lock_release_warning',
          properties: {
            resource,
            error: error as Error,
          },
        });
        this.logger.warn(`Lock release warning for ${resource}: ${error}`);
      }
    }
  }

  private buildKey(id: string, prefix?: string): string {
    return `lock:${prefix ? prefix + ':' : ''}${id}`;
  }
}
