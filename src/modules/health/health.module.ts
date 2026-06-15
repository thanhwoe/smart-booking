import { PrismaModule } from '@app/database/prisma/prisma.module';
import { RedisModule } from '@app/modules/shared/redis/redis.module';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
