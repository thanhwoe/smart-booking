import type {
  Booking,
  BookingStatus,
  Payment,
  Service,
} from './booking.entity';

// ─── Return types ────────────────────────────────────────────────────────

export type BookingWithPayment = Booking & {
  payment: Payment | null;
  slot: {
    service: Service;
    provider: {
      id: string;
      name: string;
      email: string;
    };
  };
};

export type BookingCanceled = {
  id: string;
  slotId: string;
  user: {
    name: string;
    email: string;
    id: string;
  };
  slot: {
    service: { name: string };
    startTime: Date;
  };
  payment: {
    id: string;
    status: string;
  } | null;
};

// ─── Input types ──────────────────────────────────────────────────────────────

export type CreateBookingData = Pick<
  Booking,
  'slotId' | 'userId' | 'idempotencyKey'
>;

// ─── Port / Interface ─────────────────────────────────────────────────────────

export interface IBookingRepository {
  create(data: CreateBookingData): Promise<BookingWithPayment>;
  update(id: string, data: Partial<Booking>): Promise<BookingWithPayment>;
  delete(id: string): Promise<Booking>;
  findOne(id: string): Promise<BookingWithPayment | null>;
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<BookingWithPayment | null>;
  findAll(params?: {
    skip?: number;
    take?: number;
    status?: BookingStatus;
    userId?: string;
    providerId?: string;
  }): Promise<[Booking[], number]>;
  cancel(id: string): Promise<BookingCanceled>;
  cancelExpired(): Promise<BookingCanceled[]>;
}

export const IBookingRepository = Symbol('IBookingRepository');
