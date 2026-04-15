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

@Controller('services')
@Roles(UserRole.ADMIN)
@CacheTTL(CACHE_TTL.SERVICE)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  findAll(@PaginationQuery() pagination: PaginationDto) {
    return this.servicesService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
