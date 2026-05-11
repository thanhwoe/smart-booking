import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export class BookingNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Booking with ID "${id}" not found`);
  }
}

export class BookingConfirmNotPendingError extends BadRequestException {
  constructor() {
    super('You can only confirm pending bookings');
  }
}

export class BookingConfirmNotPaidError extends BadRequestException {
  constructor() {
    super('You can only confirm bookings with successful payment');
  }
}

export class BookingCannotCancelNoOwnError extends ForbiddenException {
  constructor() {
    super('You can only cancel your own bookings');
  }
}

export class BookingAlreadyCancelledError extends BadRequestException {
  constructor() {
    super('Booking is already cancelled');
  }
}

export class BookingCannotCancelRefundedError extends BadRequestException {
  constructor() {
    super('Cannot cancel a refunded booking');
  }
}

export class BookingAlreadyRefundedError extends BadRequestException {
  constructor() {
    super('Booking is already refunded');
  }
}
