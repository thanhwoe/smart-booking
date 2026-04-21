import { Module } from '@nestjs/common';
import { ResendModule } from './resend/resend.module';
import { EmailService } from './email.service';
import { EmailLogsModule } from '@app/modules/email-logs/email-logs.module';

@Module({
  imports: [ResendModule, EmailLogsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
