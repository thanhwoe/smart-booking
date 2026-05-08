import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '@domain/user/user.repository';
import { IIdentityProvider } from '@application/user/ports/identity.port';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import type { User } from '@domain/user/user.entity';
import { FindUserUseCase } from './find-user.use-case';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IIdentityProvider)
    private readonly identityProvider: IIdentityProvider,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly findUserUseCase: FindUserUseCase,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.findUserUseCase.findById(id);
    await this.identityProvider.deleteUser(user.clerkId);
    await this.userRepository.delete(id);
    await this.cacheService.del(CACHE_KEY.USER_BY_ID(id));
    await this.cacheService.del(CACHE_KEY.USER_BY_CLERK_ID(user.clerkId));
    return user;
  }

  async deleteByClerkId(clerkId: string): Promise<User | null> {
    const user = await this.findUserUseCase.findByClerkId(clerkId);
    if (!user) return null;
    await this.userRepository.deleteByClerkId(clerkId);
    await this.cacheService.del(CACHE_KEY.USER_BY_CLERK_ID(clerkId));
    return user;
  }
}
