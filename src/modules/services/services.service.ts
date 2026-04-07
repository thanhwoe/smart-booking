import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceRepository } from './services.repository';
import { paginate, PaginationDto } from '@app/utils/pagination';

@Injectable()
export class ServicesService {
  constructor(private readonly serviceRepository: ServiceRepository) {}

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
    return this.serviceRepository.findOne(id);
  }

  update(id: string, updateServiceDto: UpdateServiceDto) {
    return this.serviceRepository.update(id, updateServiceDto);
  }

  remove(id: string) {
    return this.serviceRepository.delete(id);
  }
}
