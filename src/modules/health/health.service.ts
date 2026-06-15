import { PrismaService } from '@app/database/prisma/prisma.service';
import { RedisClient } from '@app/modules/shared/redis/redis.config';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RedisClient) private readonly redis: Redis,
  ) {}

  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async readiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
      database: 'ok',
      redis: 'ok',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = 'error';
    }

    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        checks.redis = 'error';
      }
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((value) => value === 'ok');

    return {
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
