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
import { Roles } from '@app/decorators/roles.decorator';
import { UserRole } from '@app/generated/prisma/enums';
import { PaginationQuery } from '@app/decorators/pagination.decorator';
import { PaginationDto } from '@app/utils/pagination';
import { CacheTTL } from '@app/decorators/cache.decorator';
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
@Roles(UserRole.ADMIN)
@CacheTTL(CACHE_TTL.SERVICE)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiCreatedResponse({
    summary: 'Create a new service',
    body: CreateServiceDto,
    response: ResponseServiceDto,
  })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
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
  @ApiOkResponse({
    summary: 'Update service',
    body: UpdateServiceDto,
    response: ResponseServiceDto,
  })
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    summary: 'Delete service',
    response: ResponseServiceDto,
  })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
