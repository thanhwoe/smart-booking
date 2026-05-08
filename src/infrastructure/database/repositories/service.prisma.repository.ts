import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  IServiceRepository,
  CreateServiceData,
  UpdateServiceData,
} from '@domain/service/service.repository';
import type { Service } from '@domain/service/service.entity';

@Injectable()
export class ServicePrismaRepository implements IServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateServiceData): Promise<Service> {
    return this.prisma.service.create({ data });
  }

  findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<[Service[], number]> {
    return this.prisma.$transaction([
      this.prisma.service.findMany({ skip: params?.skip, take: params?.take }),
      this.prisma.service.count(),
    ]);
  }

  findOne(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateServiceData): Promise<Service> {
    return this.prisma.service.update({ where: { id }, data });
  }

  delete(id: string): Promise<Service> {
    return this.prisma.service.delete({ where: { id } });
  }
}
