import { Inject, Injectable } from '@nestjs/common';
import {
  IServiceRepository,
  CreateServiceData,
} from '@domain/service/service.repository';
import type { Service } from '@domain/service/service.entity';

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(IServiceRepository)
    private readonly serviceRepository: IServiceRepository,
  ) {}

  execute(data: CreateServiceData): Promise<Service> {
    return this.serviceRepository.create(data);
  }
}
