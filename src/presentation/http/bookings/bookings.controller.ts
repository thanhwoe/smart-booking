import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  ApiCreatedResponse,
  ApiOkResponse,
} from '@presentation/decorators/swagger.decorator';
import {
  ResponseBookingDto,
  ResponseBookingsDto,
} from './dto/response-booking.dto';

import { CurrentUser } from '@presentation/decorators/current-user.decorator';
import { UserRole, type User } from '@domain/user/user.entity';
import { QueryBookingDto } from './dto/query-booking.dto';
import { IgnoreCache } from '@presentation/decorators/cache.decorator';

import { CreateBookingUseCase } from '@application/booking/use-cases/create-booking.use-case';
import { FindAllBookingsUseCase } from '@application/booking/use-cases/find-all-bookings.use-case';
import { FindBookingUseCase } from '@application/booking/use-cases/find-booking.use-case';
import { CancelBookingUseCase } from '@application/booking/use-cases/cancel-booking.use-case';
import { AdminOnly, Roles } from '@app/presentation/decorators/roles.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly findAllBookingsUseCase: FindAllBookingsUseCase,
    private readonly findBookingUseCase: FindBookingUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({
    summary: 'Create a new booking',
    body: CreateBookingDto,
    response: ResponseBookingDto,
  })
  create(
    @CurrentUser() user: User,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.createBookingUseCase.execute({
      slotId: createBookingDto.slotId,
      userId: user.id,
      idempotencyKey: createBookingDto.idempotencyKey,
    });
  }

  @Get()
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get all bookings',
    params: QueryBookingDto,
    response: ResponseBookingsDto,
  })
  @AdminOnly()
  findAll(@Query() query: QueryBookingDto) {
    return this.findAllBookingsUseCase.execute(query);
  }

  @Get('me')
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get my bookings',
    params: QueryBookingDto,
    response: ResponseBookingsDto,
  })
  findAllByUser(@Query() query: QueryBookingDto, @CurrentUser() user: User) {
    return this.findAllBookingsUseCase.execute({
      ...query,
      userId: user.id,
    });
  }

  @Get('provider')
  @IgnoreCache()
  @ApiOkResponse({
    summary: 'Get all bookings by provider',
    params: QueryBookingDto,
    response: ResponseBookingsDto,
  })
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  findAllByProvider(
    @Query() query: QueryBookingDto,
    @CurrentUser() user: User,
  ) {
    return this.findAllBookingsUseCase.execute({
      ...query,
      providerId: user.id,
    });
  }

  @Get(':id')
  @ApiOkResponse({
    summary: 'Get booking',
    response: ResponseBookingDto,
  })
  findOne(@Param('id') id: string) {
    return this.findBookingUseCase.execute(id);
  }

  @Patch(':id/cancel')
  @ApiOkResponse({
    summary: 'Cancel booking',
    response: ResponseBookingDto,
  })
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cancelBookingUseCase.execute({
      id,
      userId: user.id,
      userRole: user.role,
    });
  }
}
