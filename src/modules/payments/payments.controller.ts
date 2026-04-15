import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CurrentUser } from '@app/decorators/current-user.decorator';
import type { User } from '@app/generated/prisma/client';
import { AdminOnly } from '@app/decorators/roles.decorator';
import { minutes, Throttle } from '@nestjs/throttler';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout/:bookingId')
  @Throttle({ sustained: { limit: 5, ttl: minutes(1) } })
  createCheckoutSession(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: User,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckoutSession(
      bookingId,
      user,
      createCheckoutDto,
    );
  }

  @Get(':bookingId')
  findOne(@Param('bookingId') bookingId: string, @CurrentUser() user: User) {
    return this.paymentsService.findOne(bookingId, user);
  }

  @Post('refund/:bookingId')
  @AdminOnly()
  refund(@Param('bookingId') bookingId: string) {
    return this.paymentsService.refund(bookingId);
  }
}
