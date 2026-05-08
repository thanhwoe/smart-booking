import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { SlotStatus } from '@domain/slot/slot.entity';
import { UserRole } from '@domain/user/user.entity';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import { FindSlotUseCase } from './find-slot.use-case';
import {
  SlotAlreadyCancelledError,
  SlotPermissionError,
} from '@app/domain/slot/slot.errors';

@Injectable()
export class CancelSlotUseCase {
  constructor(
    @Inject(ISlotRepository) private readonly slotRepository: ISlotRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly findSlotUseCase: FindSlotUseCase,
  ) {}

  async execute(id: string, user: { id: string; role: UserRole }) {
    const slot = await this.findSlotUseCase.execute(id);

    if (user.role !== UserRole.ADMIN && slot.providerId !== user.id) {
      throw new SlotPermissionError('cancel');
    }
    if (slot.status === SlotStatus.CANCELLED) {
      throw new SlotAlreadyCancelledError(id);
    }

    const updated = await this.slotRepository.update(id, {
      status: SlotStatus.CANCELLED,
    });
    await this.cacheService.del(CACHE_KEY.SLOT_BY_ID(id));
    return updated;
  }
}
