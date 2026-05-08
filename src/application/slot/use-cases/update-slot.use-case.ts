import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { SlotStatus } from '@domain/slot/slot.entity';
import { UserRole } from '@domain/user/user.entity';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import { FindSlotUseCase } from './find-slot.use-case';
import {
  SlotHasBookingError,
  SlotPermissionError,
} from '@app/domain/slot/slot.errors';

@Injectable()
export class UpdateSlotUseCase {
  constructor(
    @Inject(ISlotRepository) private readonly slotRepository: ISlotRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly findSlotUseCase: FindSlotUseCase,
  ) {}

  async execute(
    id: string,
    data: { status?: SlotStatus },
    user: { id: string; role: UserRole },
  ) {
    const slot = await this.findSlotUseCase.execute(id);

    if (user.role !== UserRole.ADMIN && slot.providerId !== user.id) {
      throw new SlotPermissionError('update');
    }
    if (slot.bookedCount > 0) {
      throw new SlotHasBookingError(id);
    }

    const updated = await this.slotRepository.update(id, data);
    await this.cacheService.del(CACHE_KEY.SLOT_BY_ID(id));
    return updated;
  }
}
