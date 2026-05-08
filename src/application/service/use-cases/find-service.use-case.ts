import { Inject, Injectable } from '@nestjs/common';
import { IServiceRepository } from '@domain/service/service.repository';
import { ServiceNotFoundError } from '@domain/service/service.errors';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';
import type { Service } from '@domain/service/service.entity';

@Injectable()
export class FindServiceUseCase {
  constructor(
    @Inject(IServiceRepository)
    private readonly serviceRepository: IServiceRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  async execute(id: string): Promise<Service> {
    return this.cacheService.wrap(
      CACHE_KEY.SERVICE_BY_ID(id),
      CACHE_TTL.SERVICE,
      async () => {
        const service = await this.serviceRepository.findOne(id);
        if (!service) throw new ServiceNotFoundError(id);
        return service;
      },
    );
  }
}
