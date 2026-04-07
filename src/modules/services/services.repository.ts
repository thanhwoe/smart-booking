import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma/prisma.service';
import {
  ServiceCreateInput,
  ServiceUpdateInput,
} from '@app/generated/prisma/models';
import { Service } from '@app/generated/prisma/client';

interface IServiceRepository {
  create(data: ServiceCreateInput): Promise<Service>;
  findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<[Service[], number]>;
  findOne(id: string): Promise<Service | null>;
  update(id: string, data: ServiceUpdateInput): Promise<Service>;
  delete(id: string): Promise<Service>;
}

@Injectable()
export class ServiceRepository implements IServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: ServiceCreateInput): Promise<Service> {
    return this.prisma.service.create({ data });
  }

  findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<[Service[], number]> {
    return this.prisma.$transaction([
      this.prisma.service.findMany({
        skip: params?.skip,
        take: params?.take,
      }),
      this.prisma.service.count(),
    ]);
  }

  findOne(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({ where: { id } });
  }

  update(id: string, data: ServiceUpdateInput): Promise<Service> {
    return this.prisma.service.update({ where: { id }, data });
  }

  delete(id: string): Promise<Service> {
    return this.prisma.service.delete({ where: { id } });
  }
}
