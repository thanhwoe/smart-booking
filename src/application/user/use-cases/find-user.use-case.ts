import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '@domain/user/user.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';
import type { User } from '@domain/user/user.entity';
import { UserNotFoundError } from '@app/domain/user/user.errors';

@Injectable()
export class FindUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  async findById(id: string): Promise<User> {
    return this.cacheService.wrap(
      CACHE_KEY.USER_BY_ID(id),
      CACHE_TTL.USER,
      async () => {
        const user = await this.userRepository.findById(id);
        if (!user) throw new UserNotFoundError(id);
        return user;
      },
    );
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.cacheService.wrap(
      CACHE_KEY.USER_BY_CLERK_ID(clerkId),
      CACHE_TTL.USER,
      () => this.userRepository.findByClerkId(clerkId),
    );
  }
}
