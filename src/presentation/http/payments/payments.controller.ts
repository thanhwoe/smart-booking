import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CurrentUser } from '@presentation/decorators/current-user.decorator';
import type { User } from '@domain/user/user.entity';
import { AdminOnly } from '@presentation/decorators/roles.decorator';
import { minutes, Throttle } from '@nestjs/throttler';
import {
  ApiCreatedResponse,
  ApiOkResponse,
} from '@presentation/decorators/swagger.decorator';
import {
  ResponseCreateCheckoutDto,
  ResponsePaymentDto,
} from './dto/response-payments.dto';

import { CreateCheckoutUseCase } from '@application/payment/use-cases/create-checkout.use-case';
import { RefundPaymentUseCase } from '@application/payment/use-cases/refund-payment.use-case';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createCheckoutUseCase: CreateCheckoutUseCase,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  @Post('checkout/:bookingId')
  @ApiCreatedResponse({
    summary: 'Create a checkout session',
    body: CreateCheckoutDto,
    response: ResponseCreateCheckoutDto,
  })
  @Throttle({ sustained: { limit: 5, ttl: minutes(1) } })
  createCheckoutSession(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: User,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    return this.createCheckoutUseCase.execute({
      bookingId,
      user,
      successUrl: createCheckoutDto.successUrl,
    });
  }

  @Get(':bookingId')
  @ApiOkResponse({
    summary: 'Get payment by booking id',
    response: ResponsePaymentDto,
  })
  findOne(@Param('bookingId') bookingId: string, @CurrentUser() user: User) {
    return this.refundPaymentUseCase.findOne(bookingId, user);
  }

  @Post('refund/:bookingId')
  @ApiOkResponse({
    summary: 'Refund payment',
    response: ResponsePaymentDto,
  })
  @AdminOnly()
  refund(@Param('bookingId') bookingId: string) {
    return this.refundPaymentUseCase.execute(bookingId);
  }
}
