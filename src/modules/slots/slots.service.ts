import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSlotDto } from './dto/create-slot.dto';
import { SlotsRepository } from './slots.repository';
import { SlotStatus, UserRole } from '@app/generated/prisma/enums';
import { paginate } from '@app/utils/pagination';
import { QuerySlotDto } from './dto/query-slot.dto';
import { User } from '@app/generated/prisma/client';
import { ICacheService } from '@app/interfaces/cache.interface';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Injectable()
export class SlotsService {
  constructor(
    private readonly slotsRepository: SlotsRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  async create(providerId: string, createSlotDto: CreateSlotDto) {
    const startTime = new Date(createSlotDto.startTime);
    const endTime = new Date(createSlotDto.endTime);

    const overlappingSlot = await this.slotsRepository.findOverlapping({
      providerId,
      serviceId: createSlotDto.serviceId,
      startTime,
      endTime,
    });

    if (overlappingSlot) {
      throw new BadRequestException(
        'You already have a slot that overlaps with this time range',
      );
    }

    const slot = await this.slotsRepository.create({
      provider: {
        connect: { id: providerId },
      },
      service: {
        connect: { id: createSlotDto.serviceId },
      },
      startTime,
      endTime,
      capacity: createSlotDto.capacity,
      status: SlotStatus.AVAILABLE,
    });

    return slot;
  }

  async findAll(query: QuerySlotDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await this.slotsRepository.findAll({
      skip,
      take: limit,
      ...query,
    });

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.cacheService.wrap(
      CACHE_KEY.SLOT_BY_ID(id),
      CACHE_TTL.SLOT,
      async () => {
        const slot = await this.slotsRepository.findOne(id);
        if (!slot) {
          throw new NotFoundException(`Slot with ID ${id} not found`);
        }
        return slot;
      },
    );
  }

  async update(id: string, updateSlotDto: UpdateSlotDto, user: User) {
    const slot = await this.findOne(id);

    // Only the provider who owns the slot or an admin can update it
    if (user.role !== UserRole.ADMIN && slot.providerId !== user.id) {
      throw new BadRequestException('You can only update your own slots');
    }

    if (slot.bookedCount > 0) {
      throw new BadRequestException('Slot has booking');
    }

    const updated = await this.slotsRepository.update(id, {
      status: updateSlotDto.status,
    });
    await this.cacheService.del(CACHE_KEY.SLOT_BY_ID(id));
    return updated;
  }

  async remove(id: string, user: User) {
    const slot = await this.findOne(id);

    // Only the provider who owns the slot or an admin can cancel it
    if (user.role !== UserRole.ADMIN && slot.providerId !== user.id) {
      throw new BadRequestException('You can only cancel your own slots');
    }
    if (slot.status === SlotStatus.CANCELLED) {
      throw new BadRequestException('Slot is already cancelled');
    }

    const updated = await this.slotsRepository.update(id, {
      status: SlotStatus.CANCELLED,
    });

    await this.cacheService.del(CACHE_KEY.SLOT_BY_ID(id));

    return updated;
  }

  async decreaseBookingCount(id: string) {
    const slot = await this.findOne(id);
    if (slot.bookedCount === 0) {
      throw new BadRequestException('Slot has no booking');
    }
    await this.slotsRepository.update(id, {
      bookedCount: {
        decrement: 1,
      },
      status: SlotStatus.AVAILABLE,
    });
    await this.cacheService.del(CACHE_KEY.SLOT_BY_ID(id));
  }
}
