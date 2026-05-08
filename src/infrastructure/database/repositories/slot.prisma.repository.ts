import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  ISlotRepository,
  CreateSlotData,
  UpdateSlotData,
  FindSlotsParams,
} from '@domain/slot/slot.repository';
import type { Slot } from '@domain/slot/slot.entity';
import { SlotStatus } from '@domain/slot/slot.entity';
import { DateTimeFilter, SlotWhereInput } from '@app/generated/prisma/models';

@Injectable()
export class SlotPrismaRepository implements ISlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSlotData): Promise<Slot> {
    return this.prisma.slot.create({
      data: {
        service: { connect: { id: data.serviceId } },
        provider: { connect: { id: data.providerId } },
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity,
        status: data.status,
      },
    });
  }

  findAll(params?: FindSlotsParams): Promise<[Slot[], number]> {
    let startTime: DateTimeFilter<'Slot'> | undefined;
    if (params?.date) {
      const day = new Date(params.date);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      startTime = { gte: day, lt: nextDay };
    }

    const where: SlotWhereInput = {
      serviceId: params?.serviceId,
      providerId: params?.providerId,
      status: params?.status,
      startTime,
    };

    return this.prisma.$transaction([
      this.prisma.slot.findMany({
        where,
        skip: params?.skip,
        take: params?.take,
        include: { service: true, provider: true },
      }),
      this.prisma.slot.count({ where }),
    ]) as Promise<[Slot[], number]>;
  }

  findOne(id: string): Promise<Slot | null> {
    return this.prisma.slot.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateSlotData): Promise<Slot> {
    return this.prisma.slot.update({ where: { id }, data });
  }

  delete(id: string): Promise<Slot> {
    return this.prisma.slot.delete({ where: { id } });
  }

  findOverlapping(params: {
    providerId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<Slot | null> {
    return this.prisma.slot.findFirst({
      where: {
        providerId: params.providerId,
        serviceId: params.serviceId,
        status: { not: SlotStatus.CANCELLED },
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
      },
    });
  }
}
