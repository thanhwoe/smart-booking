import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOBS, QUEUES } from '../queue.constants';
import {
  BookingCancelledPayload,
  BookingConfirmedPayload,
} from '@application/common/ports/queue.port';
import { Job } from 'bullmq';
import { TrackService } from '@infrastructure/tracking/track.service';
import { ResendEmailService } from '@infrastructure/email/resend-email.service';

@Processor(QUEUES.EMAIL, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: ResendEmailService,
    private readonly trackService: TrackService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case JOBS.BOOKING_CONFIRMED:
        await this.emailService.sendBookingConfirmed(
          job.data as BookingConfirmedPayload,
        );
        break;

      case JOBS.BOOKING_CANCELLED:
        await this.emailService.sendBookingCancelled(
          job.data as BookingCancelledPayload,
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
