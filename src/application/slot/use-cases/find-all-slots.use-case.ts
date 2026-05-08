import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository } from '@domain/slot/slot.repository';
import type { SlotStatus } from '@domain/slot/slot.entity';
import { paginate } from '@app/utils/pagination';

@Injectable()
export class FindAllSlotsUseCase {
  constructor(
    @Inject(ISlotRepository) private readonly slotRepository: ISlotRepository,
  ) {}

  async execute(params: {
    page?: number;
    limit?: number;
    serviceId?: string;
    providerId?: string;
    date?: string;
    status?: SlotStatus;
  }) {
    const { page = 1, limit = 10, ...filters } = params;
    const skip = (page - 1) * limit;
    const [data, total] = await this.slotRepository.findAll({
      skip,
      take: limit,
      ...filters,
    });
    return paginate(data, total, page, limit);
  }
}
