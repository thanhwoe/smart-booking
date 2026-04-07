import {
  DateTimeFilter,
  SlotCreateInput,
  SlotUpdateInput,
  SlotWhereInput,
} from '@app/generated/prisma/models';
import { Slot, SlotStatus } from '@app/generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma/prisma.service';

interface ISlotsRepository {
  create(data: SlotCreateInput): Promise<Slot>;
  findAll(params?: {
    skip?: number;
    take?: number;
    serviceId?: string;
    providerId?: string;
    date?: string;
    status?: SlotStatus;
  }): Promise<[Slot[], number]>;
  findOne(id: string): Promise<Slot | null>;
  update(id: string, data: SlotUpdateInput): Promise<Slot>;
  delete(id: string): Promise<Slot>;
  findOverlapping(params: {
    providerId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<Slot | null>;
}

@Injectable()
export class SlotsRepository implements ISlotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: SlotCreateInput): Promise<Slot> {
    return this.prisma.slot.create({ data });
  }

  findAll(params?: {
    skip?: number;
    take?: number;
    serviceId?: string;
    providerId?: string;
    date?: string;
    status?: SlotStatus;
  }): Promise<[Slot[], number]> {
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
      }),
      this.prisma.slot.count({ where }),
    ]);
  }

  findOne(id: string): Promise<Slot | null> {
    return this.prisma.slot.findUnique({ where: { id } });
  }

  update(id: string, data: SlotUpdateInput): Promise<Slot> {
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
        status: {
          not: SlotStatus.CANCELLED,
        },
        OR: [
          {
            startTime: {
              lt: params.endTime,
            },
          },
          {
            endTime: {
              gt: params.startTime,
            },
          },
        ],
      },
    });
  }
}
