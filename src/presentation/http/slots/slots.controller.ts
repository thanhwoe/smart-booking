import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { CreateSlotDto } from './dto/create-slot.dto';
import { Roles } from '@presentation/decorators/roles.decorator';
import { UserRole } from '@domain/user/user.entity';
import { CurrentUser } from '@presentation/decorators/current-user.decorator';
import type { User } from '@domain/user/user.entity';
import { QuerySlotDto } from './dto/query-slot.dto';
import { ApiCreatedResponse } from '@presentation/decorators/swagger.decorator';
import { ResponseSlotDto, ResponseSlotsDto } from './dto/response-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { IgnoreCache } from '@presentation/decorators/cache.decorator';

import { CreateSlotUseCase } from '@application/slot/use-cases/create-slot.use-case';
import { FindSlotUseCase } from '@application/slot/use-cases/find-slot.use-case';
import { UpdateSlotUseCase } from '@application/slot/use-cases/update-slot.use-case';
import { FindAllSlotsUseCase } from '@app/application/slot/use-cases/find-all-slots.use-case';
import { CancelSlotUseCase } from '@app/application/slot/use-cases/cancel-slot.use-case';

@Controller('slots')
export class SlotsController {
  constructor(
    private readonly createSlotUseCase: CreateSlotUseCase,
    private readonly findSlotUseCase: FindSlotUseCase,
    private readonly updateSlotUseCase: UpdateSlotUseCase,
    private readonly findAllSlotsUseCase: FindAllSlotsUseCase,
    private readonly cancelSlotUseCase: CancelSlotUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({
    summary: 'Create a new slot',
    body: CreateSlotDto,
    response: ResponseSlotDto,
  })
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  create(@CurrentUser() user: User, @Body() createSlotDto: CreateSlotDto) {
    return this.createSlotUseCase.execute(user.id, createSlotDto);
  }

  @Get()
  @IgnoreCache()
  @ApiCreatedResponse({
    summary: 'Get all slots',
    params: QuerySlotDto,
    response: ResponseSlotsDto,
  })
  findAll(@Query() query: QuerySlotDto) {
    return this.findAllSlotsUseCase.execute(query);
  }

  @Get(':id')
  @ApiCreatedResponse({
    summary: 'Get a slot by ID',
    response: ResponseSlotDto,
  })
  findOne(@Param('id') id: string) {
    return this.findSlotUseCase.execute(id);
  }

  @Patch(':id')
  @ApiCreatedResponse({
    summary: 'Update a slot',
    body: UpdateSlotDto,
    response: ResponseSlotDto,
  })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateSlotDto: UpdateSlotDto,
  ) {
    return this.updateSlotUseCase.execute(id, updateSlotDto, user);
  }

  @Delete(':id')
  @ApiCreatedResponse({
    summary: 'Delete a slot',
    response: ResponseSlotDto,
  })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cancelSlotUseCase.execute(id, user);
  }
}
