import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class SlotNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Slot with ID "${id}" not found`);
  }
}

export class SlotAlreadyCancelledError extends ConflictException {
  constructor(id: string) {
    super(`Slot with ID "${id}" already cancelled`);
  }
}

export class SlotAlreadyFullError extends ConflictException {
  constructor(id: string) {
    super(`Slot with ID "${id}" already full`);
  }
}

export class SlotHasNoBookingError extends BadRequestException {
  constructor(id: string) {
    super(`Slot with ID "${id}" has no booking`);
  }
}

export class SlotOverlapError extends BadRequestException {
  constructor() {
    super(`You already have a slot that overlaps with this time range`);
  }
}
export class SlotPermissionError extends BadRequestException {
  constructor(action: string) {
    super(`You can only ${action} your own slots`);
  }
}

export class SlotHasBookingError extends BadRequestException {
  constructor(id: string) {
    super(`Slot with ID "${id}" has booking`);
  }
}
