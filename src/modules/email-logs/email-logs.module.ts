import { Module } from '@nestjs/common';
import { EmailLogsService } from './email-logs.service';
import { EmailLogsController } from './email-logs.controller';
import { EmailLogsRepository } from './email-logs.repository';
import { EmailSuppressionsRepository } from './email-suppressions.repository';

@Module({
  controllers: [EmailLogsController],
  providers: [
    EmailLogsService,
    EmailLogsRepository,
    EmailSuppressionsRepository,
  ],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}
