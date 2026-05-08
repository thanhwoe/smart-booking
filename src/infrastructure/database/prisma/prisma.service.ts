import { PrismaClient } from '@app/generated/prisma/client';
import { TrackService } from '@infrastructure/tracking/track.service';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });

    super({
      adapter,
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    if (configService.get<string>('NODE_ENV') === 'development') {
      this.$on('query' as never, (e: { query: string; duration: number }) => {
        trackService.capture({
          event: 'query',
          distinctId: 'system',
          properties: { query: e.query, duration: e.duration },
        });
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}
