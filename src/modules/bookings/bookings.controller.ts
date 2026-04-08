import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '@app/decorators/current-user.decorator';
import { UserRole, type User } from '@app/generated/prisma/client';
import { PaginationQuery } from '@app/decorators/pagination.decorator';
import { PaginationDto } from '@app/utils/pagination';
import { QueryBookingDto } from './dto/query-booking.dto';
import { Roles } from '@app/decorators/roles.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user, createBookingDto);
  }

  @Get()
  findByUser(
    @CurrentUser() user: User,
    @PaginationQuery() pagination: PaginationDto,
    @Query() query: QueryBookingDto,
  ) {
    return this.bookingsService.findByUser(user, pagination, query);
  }

  @Get('all')
  @Roles(UserRole.ADMIN)
  findAll(
    @PaginationQuery() pagination: PaginationDto,
    @Query() query: QueryBookingDto,
  ) {
    return this.bookingsService.findAll(pagination, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  confirm(@Param('id') id: string) {
    return this.bookingsService.confirm(id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingsService.cancel(id, user);
  }
}
