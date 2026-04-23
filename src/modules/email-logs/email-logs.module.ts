import { Module } from '@nestjs/common';
import { EmailLogsService } from './email-logs.service';
import { EmailLogsController } from './email-logs.controller';
import { EmailLogsRepository } from './email-logs.repository';
import { EmailSuppressionsRepository } from './email-suppressions.repository';
import { ReleaseExpiredSuppressionsTask } from './tasks/release-expired-suppressions.task';

@Module({
  controllers: [EmailLogsController],
  providers: [
    EmailLogsService,
    EmailLogsRepository,
    EmailSuppressionsRepository,
    ReleaseExpiredSuppressionsTask,
  ],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}
