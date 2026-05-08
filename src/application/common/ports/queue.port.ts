/**
 * Port: IQueueService
 * Application layer abstraction over any job queue (BullMQ, SQS, etc.)
 */
export type BookingConfirmedPayload = {
  bookingId: string;
  userId: string;
  userEmail: string;
  userName: string;
  serviceName: string;
  providerName: string;
  startTime: string;
  endTime: string;
  amount: number;
  currency: string;
};

export type BookingCancelledPayload = {
  bookingId: string;
  userId: string;
  userEmail: string;
  userName: string;
  serviceName: string;
  startTime: string;
  refunded: boolean;
};

export interface IQueueService {
  dispatchBookingConfirmed(payload: BookingConfirmedPayload): Promise<void>;
  dispatchBookingCancelled(payload: BookingCancelledPayload): Promise<void>;
}

export const IQueueService = Symbol('IQueueService');
