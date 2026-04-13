import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOBS, QUEUES } from '../queue.constants';
import {
  BookingCancelledJobPayload,
  BookingConfirmedJobPayload,
  EmailJobPayload,
} from '@app/interfaces/email-jobs.interface';
import { Job } from 'bullmq';
import { EmailService } from '../../email/email.service';
import { TrackService } from '../../track/track.service';

@Processor(QUEUES.EMAIL, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly trackService: TrackService,
  ) {
    super();
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    switch (job.name) {
      case JOBS.BOOKING_CONFIRMED:
        await this.emailService.sendBookingConfirmed(
          job.data as BookingConfirmedJobPayload,
        );
        break;

      case JOBS.BOOKING_CANCELLED:
        await this.emailService.sendBookingCancelled(
          job.data as BookingCancelledJobPayload,
        );

        break;

      default:
        this.trackService.capture({
          distinctId: 'system',
          event: 'unknown_job_type',
          properties: {
            jobName: job.name,
            jobId: job.id,
          },
        });
    }
  }
}
