import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getBullMQConfig } from './bullmq.config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: getBullMQConfig,
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class BullMQModule {}
