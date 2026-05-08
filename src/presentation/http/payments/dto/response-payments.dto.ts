import { Payment, PaymentStatus } from '@app/generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/client';

export class ResponseCreateCheckoutDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  id: string;
}

export class ResponsePaymentDto implements Payment {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bookingId: string;

  @ApiProperty()
  amount: Decimal;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: PaymentStatus;

  @ApiProperty()
  stripeSessionId: string;

  @ApiProperty()
  stripePaymentIntent: string;

  @ApiProperty()
  paidAt: Date;

  @ApiProperty()
  refundedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
