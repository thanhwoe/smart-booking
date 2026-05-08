import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';
import type { Slot } from '@domain/slot/slot.entity';
import { SlotNotFoundError } from '@app/domain/slot/slot.errors';

@Injectable()
export class FindSlotUseCase {
  constructor(
    @Inject(ISlotRepository) private readonly slotRepository: ISlotRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  async execute(id: string): Promise<Slot> {
    return this.cacheService.wrap(
      CACHE_KEY.SLOT_BY_ID(id),
      CACHE_TTL.SLOT,
      async () => {
        const slot = await this.slotRepository.findOne(id);
        if (!slot) throw new SlotNotFoundError(id);
        return slot;
      },
    );
  }
}
