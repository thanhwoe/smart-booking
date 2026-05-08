import { Inject, Injectable } from '@nestjs/common';
import { IServiceRepository } from '@domain/service/service.repository';
import { paginate, PaginationDto } from '@app/utils/pagination';

@Injectable()
export class FindAllServicesUseCase {
  constructor(
    @Inject(IServiceRepository)
    private readonly serviceRepository: IServiceRepository,
  ) {}

  async execute(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.serviceRepository.findAll({
      skip,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }
}
