import { Inject, Injectable } from '@nestjs/common';
import {
  IBookingRepository,
  BookingWithPayment,
} from '@domain/booking/booking.repository';
import { BookingStatus } from '@domain/booking/booking.entity';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import { FindBookingUseCase } from './find-booking.use-case';
import {
  SlotHasNoBookingError,
  SlotNotFoundError,
} from '@app/domain/slot/slot.errors';
import { SlotStatus } from '@domain/slot/slot.entity';
import { BookingAlreadyRefundedError } from '@app/domain/booking/booking.errors';

@Injectable()
export class RefundBookingUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
    @Inject(ISlotRepository)
    private readonly slotRepository: ISlotRepository,
    @Inject(ICacheService)
    private readonly cacheService: ICacheService,
    private readonly findBookingUseCase: FindBookingUseCase,
  ) {}

  async execute(id: string): Promise<BookingWithPayment> {
    const booking = await this.findBookingUseCase.execute(id);

    if (booking.status === BookingStatus.REFUNDED) {
      throw new BookingAlreadyRefundedError();
    }

    // Decrease slot booking count
    const slot = await this.slotRepository.findOne(booking.slotId);
    if (!slot) throw new SlotNotFoundError(booking.slotId);
    if (slot.bookedCount === 0) {
      throw new SlotHasNoBookingError(booking.slotId);
    }

    await this.slotRepository.update(booking.slotId, {
      bookedCount: { decrement: 1 },
      status: SlotStatus.AVAILABLE,
    });
    await this.cacheService.del(CACHE_KEY.SLOT_BY_ID(booking.slotId));

    const updated = await this.bookingRepository.update(id, {
      status: BookingStatus.REFUNDED,
      cancelledAt: new Date(),
    });

    await this.cacheService.del(CACHE_KEY.BOOKING_BY_ID(id));

    return updated;
  }
}
