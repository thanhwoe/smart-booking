import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { AdminOnly } from '@presentation/decorators/roles.decorator';
import { PaginationQuery } from '@presentation/decorators/pagination.decorator';
import { PaginationDto } from '@app/utils/pagination';
import {
  CacheTTL,
  IgnoreCache,
} from '@presentation/decorators/cache.decorator';
import { CACHE_TTL } from '@app/constants/cache.constants';
import {
  ApiCreatedResponse,
  ApiOkResponse,
} from '@presentation/decorators/swagger.decorator';
import {
  ResponseServiceDto,
  ResponseServicesDto,
} from './dto/response-service.dto';

import { FindServiceUseCase } from '@application/service/use-cases/find-service.use-case';
import { FindAllServicesUseCase } from '@app/application/service/use-cases/find-all-services.use-case';
import { CreateServiceUseCase } from '@app/application/service/use-cases/create-service.use-case';
import { UpdateServiceUseCase } from '@app/application/service/use-cases/update-service.use-case';
import { DeleteServiceUseCase } from '@app/application/service/use-cases/delete-service.use-case';

@Controller('services')
@CacheTTL(CACHE_TTL.SERVICE)
export class ServicesController {
  constructor(
    private readonly findServiceUseCase: FindServiceUseCase,
    private readonly findAllServicesUseCase: FindAllServicesUseCase,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
  ) {}

  @Post()
  @AdminOnly()
  @ApiCreatedResponse({
    summary: 'Create a new service',
    body: CreateServiceDto,
    response: ResponseServiceDto,
  })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.createServiceUseCase.execute(createServiceDto);
  }

  @Get()
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get services',
    params: PaginationDto,
    response: ResponseServicesDto,
  })
  findAll(@PaginationQuery() pagination: PaginationDto) {
    return this.findAllServicesUseCase.execute(pagination);
  }

  @Get(':id')
  @ApiOkResponse({
    summary: 'Get service by id',
    response: ResponseServiceDto,
  })
  findOne(@Param('id') id: string) {
    return this.findServiceUseCase.execute(id);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOkResponse({
    summary: 'Update service',
    body: UpdateServiceDto,
    response: ResponseServiceDto,
  })
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.updateServiceUseCase.execute(id, updateServiceDto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOkResponse({
    summary: 'Delete service',
    response: ResponseServiceDto,
  })
  remove(@Param('id') id: string) {
    return this.deleteServiceUseCase.execute(id);
  }
}
