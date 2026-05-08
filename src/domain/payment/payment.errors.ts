export class PaymentNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Payment not found for booking "${bookingId}"`);
    this.name = 'PaymentNotFoundError';
  }
}
