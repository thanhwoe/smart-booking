import { Inject, Injectable } from '@nestjs/common';
import {
  IBookingRepository,
  BookingWithPayment,
} from '@domain/booking/booking.repository';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { SlotStatus } from '@domain/slot/slot.entity';
import { ILockService } from '@application/common/ports/lock.port';
import {
  SlotAlreadyCancelledError,
  SlotAlreadyFullError,
  SlotNotFoundError,
} from '@app/domain/slot/slot.errors';

export type CreateBookingInput = {
  slotId: string;
  userId: string;
  idempotencyKey: string;
};

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
    @Inject(ISlotRepository)
    private readonly slotRepository: ISlotRepository,
    @Inject(ILockService)
    private readonly lockService: ILockService,
  ) {}

  async execute(input: CreateBookingInput): Promise<BookingWithPayment> {
    // Idempotency check — return existing booking for duplicate requests
    const existing = await this.bookingRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) return existing;

    // Optimistic pre-flight check
    const slot = await this.slotRepository.findOne(input.slotId);
    if (!slot) {
      throw new SlotNotFoundError(input.slotId);
    }
    if (slot.status === SlotStatus.CANCELLED) {
      throw new SlotAlreadyCancelledError(input.slotId);
    }
    if (slot.bookedCount >= slot.capacity) {
      throw new SlotAlreadyFullError(input.slotId);
    }

    // Acquire distributed lock before entering the DB transaction
    return this.lockService.withLock(
      input.slotId,
      () =>
        this.bookingRepository.create({
          slotId: input.slotId,
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
        }),
      'booking',
    );
  }
}
