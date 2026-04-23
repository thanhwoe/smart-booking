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

  /**
   * Create a new user
   * @param createUserDto User creation data
   * @returns The created user
   */
  create(createUserDto: CreateUserDto) {
    return this.usersRepository.create(createUserDto);
  }

  /**
   * Retrieve all users with pagination
   * @param pagination Pagination configuration
   * @returns Paginated list of users
   */
  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.usersRepository.findAll({
      skip,
      take: limit,
    });

    return paginate(data, total, page, limit);
  }

  /**
   * Find a user by their ID, utilizing cache
   * @param id User ID
   * @returns The user
   */
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

  /**
   * Update a user's information
   * @param id User ID
   * @param updateUserDto Updated user data
   * @returns The updated user
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    const updatedUser = await this.usersRepository.update(id, updateUserDto);
    await this.cacheService.del(CACHE_KEY.USER_BY_ID(id));
    return updatedUser;
  }

  /**
   * Remove a user completely, including from Clerk
   * @param id User ID
   * @returns The deleted user
   */
  async remove(id: string) {
    const user = await this.findOne(id);
    await this.clerkClient.users.deleteUser(user.clerkId);
    await this.usersRepository.delete(id);
    await this.cacheService.del(CACHE_KEY.USER_BY_ID(id));
    await this.cacheService.del(CACHE_KEY.USER_BY_CLERK_ID(user.clerkId));
    return user;
  }

  /**
   * Sync a user created via Clerk webhook into the local DB
   * @param data User creation data
   * @returns The synced user
   */
  syncClerkUser(data: CreateUserDto) {
    return this.usersRepository.syncClerkUser(data);
  }

  /**
   * Delete a user by their Clerk ID
   * @param clerkId Clerk user ID
   * @returns The deleted user or null if not found
   */
  async deleteByClerkId(clerkId: string) {
    const user = await this.findByClerkId(clerkId);

    if (!user) {
      return null;
    }

    await this.usersRepository.deleteByClerkId(clerkId);
    await this.cacheService.del(CACHE_KEY.USER_BY_CLERK_ID(clerkId));

    return user;
  }

  /**
   * Find a user by their Clerk ID, utilizing cache
   * @param clerkId Clerk user ID
   * @returns The user
   */
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
