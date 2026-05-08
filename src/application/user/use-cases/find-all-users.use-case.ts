import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '@domain/user/user.repository';

import { paginate, PaginationDto } from '@app/utils/pagination';

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.userRepository.findAll({
      skip,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }
}
