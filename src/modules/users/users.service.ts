import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { paginate, PaginationDto } from '@app/utils/pagination';
import { CLERK_CLIENT } from '../auth/clerk/clerk-client.provider';
import type { ClerkClient } from '@clerk/backend';
import { ICacheService } from '@app/interfaces/cache.interface';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(CLERK_CLIENT)
    private readonly clerkClient: ClerkClient,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  create(createUserDto: CreateUserDto) {
    return this.usersRepository.create(createUserDto);
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.usersRepository.findAll({
      skip,
      take: limit,
    });

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.cacheService.wrap(
      CACHE_KEY.USER_BY_ID(id),
      CACHE_TTL.USER,
      async () => {
        const user = await this.usersRepository.findById(id);
        if (!user) {
          throw new NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
      },
    );
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    const updatedUser = await this.usersRepository.update(id, updateUserDto);
    await this.cacheService.del(CACHE_KEY.USER_BY_ID(id));
    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.clerkClient.users.deleteUser(user.clerkId);
    await this.usersRepository.delete(id);
    await this.cacheService.del(CACHE_KEY.USER_BY_ID(id));
    return user;
  }

  syncClerkUser(data: CreateUserDto) {
    return this.usersRepository.syncClerkUser(data);
  }

  async deleteByClerkId(clerkId: string) {
    const user = await this.findByClerkId(clerkId);

    if (!user) {
      return null;
    }

    await this.usersRepository.deleteByClerkId(clerkId);
    await this.cacheService.del(CACHE_KEY.USER_BY_CLERK_ID(clerkId));

    return user;
  }

  async findByClerkId(clerkId: string) {
    return this.cacheService.wrap(
      CACHE_KEY.USER_BY_CLERK_ID(clerkId),
      CACHE_TTL.USER,
      async () => {
        return this.usersRepository.findByClerkId(clerkId);
      },
    );
  }
}
