import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';
import { QueueService } from './queue.service';
import { BullMQModule } from './bullmq/bullmq.module';
import { EmailModule } from '../email/email.module';
import { EmailProcessor } from './processors/email.processor';

@Module({
  imports: [
    BullMQModule,
    BullModule.registerQueue({
      name: QUEUES.EMAIL,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    EmailModule,
  ],
  providers: [QueueService, EmailProcessor],
  exports: [QueueService],
})
export class QueueModule {}
