export interface BookingConfirmedJobPayload {
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
}

export interface BookingCancelledJobPayload {
  bookingId: string;
  userId: string;
  userEmail: string;
  userName: string;
  serviceName: string;
  startTime: string;
  refunded: boolean;
}

export type EmailJobPayload =
  | BookingConfirmedJobPayload
  | BookingCancelledJobPayload;
