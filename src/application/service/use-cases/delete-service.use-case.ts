import { Inject, Injectable } from '@nestjs/common';
import { IServiceRepository } from '@domain/service/service.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import type { Service } from '@domain/service/service.entity';
import { FindServiceUseCase } from './find-service.use-case';

@Injectable()
export class DeleteServiceUseCase {
  constructor(
    @Inject(IServiceRepository)
    private readonly serviceRepository: IServiceRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly findServiceUseCase: FindServiceUseCase,
  ) {}

  async execute(id: string): Promise<Service> {
    await this.findServiceUseCase.execute(id); // ensure exists
    const deleted = await this.serviceRepository.delete(id);
    await this.cacheService.del(CACHE_KEY.SERVICE_BY_ID(id));
    return deleted;
  }
}
