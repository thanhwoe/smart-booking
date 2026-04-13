import { Controller } from '@nestjs/common';
import { EmailLogsService } from './email-logs.service';

@Controller('email-logs')
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}
}
