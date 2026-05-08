import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from '@domain/user/user.repository';
import type { User } from '@domain/user/user.entity';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<[User[], number]> {
    return this.prisma.$transaction([
      this.prisma.user.findMany(params),
      this.prisma.user.count(),
    ]);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByClerkId(clerkId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { clerkId } });
  }

  syncClerkUser(data: CreateUserData): Promise<User> {
    return this.prisma.user.upsert({
      where: { clerkId: data.clerkId },
      update: { name: data.name, email: data.email, phone: data.phone },
      create: {
        clerkId: data.clerkId,
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    });
  }

  deleteByClerkId(clerkId: string): Promise<User> {
    return this.prisma.user.delete({ where: { clerkId } });
  }
}
