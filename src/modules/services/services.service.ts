import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceRepository } from './services.repository';
import { paginate, PaginationDto } from '@app/utils/pagination';
import { ICacheService } from '@app/interfaces/cache.interface';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';

@Injectable()
export class ServicesService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  create(createServiceDto: CreateServiceDto) {
    return this.serviceRepository.create(createServiceDto);
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.serviceRepository.findAll({
      skip,
      take: limit,
    });

    return paginate(data, total, page, limit);
  }

  findOne(id: string) {
    return this.cacheService.wrap(
      CACHE_KEY.SERVICE_BY_ID(id),
      CACHE_TTL.SERVICE,
      async () => {
        const service = await this.serviceRepository.findOne(id);
        if (!service) {
          throw new NotFoundException(`Service with ID ${id} not found`);
        }
        return service;
      },
    );
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    await this.findOne(id);
    const updated = await this.serviceRepository.update(id, updateServiceDto);
    await this.cacheService.del(CACHE_KEY.SERVICE_BY_ID(id));
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.serviceRepository.delete(id);
    await this.cacheService.del(CACHE_KEY.SERVICE_BY_ID(id));
    return deleted;
  }
}
