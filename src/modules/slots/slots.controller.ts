import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { SlotsService } from './slots.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { Roles } from '@app/decorators/roles.decorator';
import { UserRole } from '@app/generated/prisma/enums';
import { CurrentUser } from '@app/decorators/current-user.decorator';
import type { User } from '@app/generated/prisma/client';
import { PaginationQuery } from '@app/decorators/pagination.decorator';
import { PaginationDto } from '@app/utils/pagination';
import { QuerySlotDto } from './dto/query-slot.dto';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  create(@CurrentUser() user: User, @Body() createSlotDto: CreateSlotDto) {
    return this.slotsService.create(user.id, createSlotDto);
  }

  @Get()
  findAll(
    @PaginationQuery() pagination: PaginationDto,
    @Query() query: QuerySlotDto,
  ) {
    return this.slotsService.findAll(pagination, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.slotsService.findOne(id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.slotsService.remove(id, user);
  }
}
