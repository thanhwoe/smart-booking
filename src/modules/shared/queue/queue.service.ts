import { Injectable } from '@nestjs/common';
import { JOBS, QUEUES } from './queue.constants';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BookingCancelledJobPayload,
  BookingConfirmedJobPayload,
} from '@app/interfaces/email-jobs.interface';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(QUEUES.EMAIL) private readonly emailQueue: Queue) {}

  async dispatchBookingConfirmed(
    payload: BookingConfirmedJobPayload,
  ): Promise<void> {
    await this.emailQueue.add(JOBS.BOOKING_CONFIRMED, payload, {
      jobId: `confirmed_${payload.bookingId}`,
    });
  }

  async dispatchBookingCancelled(
    payload: BookingCancelledJobPayload,
  ): Promise<void> {
    await this.emailQueue.add(JOBS.BOOKING_CANCELLED, payload, {
      jobId: `cancelled_${payload.bookingId}`,
    });
  }
}
