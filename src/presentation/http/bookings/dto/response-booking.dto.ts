import { Booking, BookingStatus } from '@app/generated/prisma/client';
import { PaginatedResult, PaginationResponseDto } from '@app/utils/pagination';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseBookingDto implements Booking {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  slotId: string;

  @ApiProperty()
  status: BookingStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  cancelledAt: Date;

  @ApiProperty()
  completedAt: Date;

  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  idempotencyKey: string;

  @ApiProperty()
  confirmedAt: Date | null;
}

export class ResponseBookingsDto
  extends PaginationResponseDto
  implements PaginatedResult<Booking>
{
  @ApiProperty({
    type: [ResponseBookingDto],
  })
  data: ResponseBookingDto[];
}
