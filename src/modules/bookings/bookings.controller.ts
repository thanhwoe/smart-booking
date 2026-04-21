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
import { QueryBookingDto } from './dto/query-booking.dto';
import { Roles } from '@app/decorators/roles.decorator';
import { CacheTTL, IgnoreCache } from '@app/decorators/cache.decorator';
import { CACHE_TTL } from '@app/constants/cache.constants';
import { minutes, Throttle } from '@nestjs/throttler';
import {
  ApiCreatedResponse,
  ApiOkResponse,
} from '@app/decorators/swagger.decorator';
import {
  ResponseBookingDto,
  ResponseBookingsDto,
} from './dto/response-booking.dto';

@Controller('bookings')
@CacheTTL(CACHE_TTL.BOOKING)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiCreatedResponse({
    summary: 'Create a new booking',
    body: CreateBookingDto,
    response: ResponseBookingDto,
  })
  @Throttle({ sustained: { limit: 10, ttl: minutes(1) } })
  create(
    @CurrentUser() user: User,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user, createBookingDto);
  }

  @Get()
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get bookings by user',
    params: QueryBookingDto,
    response: ResponseBookingsDto,
  })
  findByUser(@CurrentUser() user: User, @Query() query: QueryBookingDto) {
    return this.bookingsService.findByUser(user, query);
  }

  @Get('all')
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get all bookings',
    params: QueryBookingDto,
    response: ResponseBookingsDto,
    roles: [UserRole.ADMIN],
  })
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: QueryBookingDto) {
    return this.bookingsService.findAll(query);
  }

  @Get('provider')
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get bookings by provider',
    params: QueryBookingDto,
    response: ResponseBookingsDto,
    roles: [UserRole.PROVIDER, UserRole.ADMIN],
  })
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  findByProvider(@CurrentUser() user: User, @Query() query: QueryBookingDto) {
    return this.bookingsService.findByProvider(user, query);
  }

  @Get(':id')
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get booking by id',
    params: QueryBookingDto,
    response: ResponseBookingDto,
  })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    summary: 'Confirm booking',
    response: ResponseBookingDto,
    roles: [UserRole.ADMIN, UserRole.PROVIDER],
  })
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  confirm(@Param('id') id: string) {
    return this.bookingsService.confirm(id);
  }

  @Delete(':id')
  @ApiOkResponse({
    summary: 'Cancel booking',
    response: ResponseBookingDto,
  })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingsService.cancel(id, user);
  }
}
