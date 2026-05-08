import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, UpdateUserData } from '@domain/user/user.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import type { User } from '@domain/user/user.entity';
import { FindUserUseCase } from './find-user.use-case';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly findUserUseCase: FindUserUseCase,
  ) {}

  async execute(id: string, data: UpdateUserData): Promise<User> {
    await this.findUserUseCase.findById(id); // ensures user exists
    const updated = await this.userRepository.update(id, data);
    await this.cacheService.del(CACHE_KEY.USER_BY_ID(id));
    return updated;
  }
}
