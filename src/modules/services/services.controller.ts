import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { AdminOnly } from '@app/decorators/roles.decorator';
import { PaginationQuery } from '@app/decorators/pagination.decorator';
import { PaginationDto } from '@app/utils/pagination';
import { CacheTTL, IgnoreCache } from '@app/decorators/cache.decorator';
import { CACHE_TTL } from '@app/constants/cache.constants';
import {
  ApiCreatedResponse,
  ApiOkResponse,
} from '@app/decorators/swagger.decorator';
import {
  ResponseServiceDto,
  ResponseServicesDto,
} from './dto/response-service.dto';

@Controller('services')
@CacheTTL(CACHE_TTL.SERVICE)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @AdminOnly()
  @ApiCreatedResponse({
    summary: 'Create a new service',
    body: CreateServiceDto,
    response: ResponseServiceDto,
  })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get services',
    params: PaginationDto,
    response: ResponseServicesDto,
  })
  findAll(@PaginationQuery() pagination: PaginationDto) {
    return this.servicesService.findAll(pagination);
  }

  @Get(':id')
  @ApiOkResponse({
    summary: 'Get service by id',
    response: ResponseServiceDto,
  })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOkResponse({
    summary: 'Update service',
    body: UpdateServiceDto,
    response: ResponseServiceDto,
  })
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOkResponse({
    summary: 'Delete service',
    response: ResponseServiceDto,
  })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
