import { BookingStatus } from '@app/generated/prisma/enums';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '@app/utils/pagination';

export class QueryBookingDto extends PaginationDto {
  @ApiProperty({
    enum: BookingStatus,
    description: 'Booking status',
    example: BookingStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
