import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';
import { BullMQQueueService } from './bullmq-queue.service';
import { BullMQModule } from './bullmq/bullmq.module';
import { EmailModule } from '@infrastructure/email/email.module';
import { EmailProcessor } from './processors/email.processor';
import { IQueueService } from '@application/common/ports/queue.port';

@Global()
@Module({
  imports: [
    BullMQModule,
    BullModule.registerQueue({
      name: QUEUES.EMAIL,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    EmailModule,
  ],
  providers: [
    EmailProcessor,
    {
      provide: IQueueService,
      useClass: BullMQQueueService,
    },
  ],
  exports: [IQueueService, EmailModule],
})
export class QueueModule {}
