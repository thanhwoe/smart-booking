import { PrismaService } from '@app/database/prisma/prisma.service';
import { User } from '@app/generated/prisma/client';
import { UserCreateInput, UserUpdateInput } from '@app/generated/prisma/models';
import { Injectable } from '@nestjs/common';

interface IUsersRepository {
  create(data: UserCreateInput): Promise<User>;
  update(id: string, data: UserUpdateInput): Promise<User>;
  delete(id: string): Promise<User>;
  findById(id: string): Promise<User | null>;
  findAll(params?: { skip?: number; take?: number }): Promise<[User[], number]>;
  findByEmail(email: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  syncClerkUser(data: UserCreateInput): Promise<User>;
  deleteByClerkId(clerkId: string): Promise<User>;
}

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<[User[], number]> {
    return this.prisma.$transaction([
      this.prisma.user.findMany(params),
      this.prisma.user.count(),
    ]);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { clerkId } });
  }

  async syncClerkUser(data: UserCreateInput): Promise<User> {
    return this.prisma.user.upsert({
      where: { clerkId: data.clerkId },
      update: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
      create: {
        clerkId: data.clerkId,
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    });
  }

  async deleteByClerkId(clerkId: string): Promise<User> {
    return this.prisma.user.delete({ where: { clerkId } });
  }
}
