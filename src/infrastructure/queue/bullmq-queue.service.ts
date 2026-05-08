import { Injectable } from '@nestjs/common';
import { JOBS, QUEUES } from './queue.constants';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BookingCancelledPayload,
  BookingConfirmedPayload,
  IQueueService,
} from '@application/common/ports/queue.port';

@Injectable()
export class BullMQQueueService implements IQueueService {
  constructor(@InjectQueue(QUEUES.EMAIL) private readonly emailQueue: Queue) {}

  async dispatchBookingConfirmed(
    payload: BookingConfirmedPayload,
  ): Promise<void> {
    await this.emailQueue.add(JOBS.BOOKING_CONFIRMED, payload, {
      jobId: `confirmed_${payload.bookingId}`,
    });
  }

  async dispatchBookingCancelled(
    payload: BookingCancelledPayload,
  ): Promise<void> {
    await this.emailQueue.add(JOBS.BOOKING_CANCELLED, payload, {
      jobId: `cancelled_${payload.bookingId}`,
    });
  }
}
