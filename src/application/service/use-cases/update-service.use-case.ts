import { Inject, Injectable } from '@nestjs/common';
import {
  IServiceRepository,
  UpdateServiceData,
} from '@domain/service/service.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { CACHE_KEY } from '@app/constants/cache.constants';
import type { Service } from '@domain/service/service.entity';
import { FindServiceUseCase } from './find-service.use-case';

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(IServiceRepository)
    private readonly serviceRepository: IServiceRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly findServiceUseCase: FindServiceUseCase,
  ) {}

  async execute(id: string, data: UpdateServiceData): Promise<Service> {
    await this.findServiceUseCase.execute(id); // ensure exists
    const updated = await this.serviceRepository.update(id, data);
    await this.cacheService.del(CACHE_KEY.SERVICE_BY_ID(id));
    return updated;
  }
}
