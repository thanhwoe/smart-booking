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
import { ApiCreatedResponse } from '@app/decorators/swagger.decorator';
import { ResponseSlotDto, ResponseSlotsDto } from './dto/response-slot.dto';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @ApiCreatedResponse({
    summary: 'Create a new slot',
    body: CreateSlotDto,
    response: ResponseSlotDto,
  })
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  create(@CurrentUser() user: User, @Body() createSlotDto: CreateSlotDto) {
    return this.slotsService.create(user.id, createSlotDto);
  }

  @Get()
  @ApiCreatedResponse({
    summary: 'Get all slots',
    params: QuerySlotDto,
    response: ResponseSlotsDto,
  })
  findAll(
    @PaginationQuery() pagination: PaginationDto,
    @Query() query: QuerySlotDto,
  ) {
    return this.slotsService.findAll(pagination, query);
  }

  @Get(':id')
  @ApiCreatedResponse({
    summary: 'Get a slot by ID',
    response: ResponseSlotDto,
  })
  findOne(@Param('id') id: string) {
    return this.slotsService.findOne(id);
  }

  @Delete(':id')
  @ApiCreatedResponse({
    summary: 'Delete a slot',
    response: ResponseSlotDto,
  })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.slotsService.remove(id, user);
  }
}
