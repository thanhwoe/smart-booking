import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { SlotStatus } from '@domain/slot/slot.entity';
import { IServiceRepository } from '@domain/service/service.repository';
import { ServiceNotFoundError } from '@domain/service/service.errors';
import type { Slot } from '@domain/slot/slot.entity';
import { SlotOverlapError } from '@domain/slot/slot.errors';

@Injectable()
export class CreateSlotUseCase {
  constructor(
    @Inject(ISlotRepository) private readonly slotRepository: ISlotRepository,
    @Inject(IServiceRepository)
    private readonly serviceRepository: IServiceRepository,
  ) {}

  async execute(
    providerId: string,
    input: {
      serviceId: string;
      startTime: string;
      endTime: string;
      capacity?: number;
    },
  ): Promise<Slot> {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    const service = await this.serviceRepository.findOne(input.serviceId);
    if (!service) throw new ServiceNotFoundError(input.serviceId);

    const overlapping = await this.slotRepository.findOverlapping({
      providerId,
      serviceId: input.serviceId,
      startTime,
      endTime,
    });
    if (overlapping) {
      throw new SlotOverlapError();
    }

    return this.slotRepository.create({
      providerId: providerId,
      serviceId: input.serviceId,
      startTime,
      endTime,
      capacity: input.capacity,
      status: SlotStatus.AVAILABLE,
    });
  }
}
