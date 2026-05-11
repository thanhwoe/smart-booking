import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class PaymentNotFoundError extends NotFoundException {
  constructor() {
    super(`Payment record not found for this booking`);
  }
}

export class PaymentNotOwnError extends UnauthorizedException {
  constructor() {
    super('You can only view your own payments');
  }
}

export class PaymentNotOnRefundableStatusError extends BadRequestException {
  constructor() {
    super('Only PAID payments can be refunded');
  }
}

export class PaymentNoStripePaymentIntentError extends BadRequestException {
  constructor() {
    super('No Stripe payment intent on record — cannot refund');
  }
}
