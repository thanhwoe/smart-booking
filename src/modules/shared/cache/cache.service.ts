import { ICacheService } from '@app/interfaces/cache.interface';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisClient } from '../redis/redis.config';

@Injectable()
export class CacheService implements ICacheService {
  private readonly logger = new Logger(CacheService.name);

  // In-memory map to deduplicate concurrent fetcher calls per key
  private readonly inflightMap = new Map<string, Promise<any>>();

  constructor(
    @Inject(RedisClient)
    private readonly redisClient: Redis,
  ) {
    redisClient.on('error', (err) =>
      this.logger.error(`Redis cache error: ${err.message}`),
    );

    redisClient.on('reconnecting', () =>
      this.logger.warn(`Redis cache reconnecting...`),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.redisClient.ping();
    this.logger.log('Redis cache connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redisClient.get(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Failed to parse cache value for key: ${key}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttlSeconds && ttlSeconds > 0) {
      await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // Already a fetcher running for this key — share its Promise
    const inflight = this.inflightMap.get(key);
    if (inflight) return inflight as Promise<T>;

    const fetchPromise = fetcher()
      .then(async (result) => {
        await this.set(key, result, ttlSeconds);
        return result;
      })
      .finally(() => {
        this.inflightMap.delete(key);
      });

    this.inflightMap.set(key, fetchPromise);
    return fetchPromise;
  }
}
