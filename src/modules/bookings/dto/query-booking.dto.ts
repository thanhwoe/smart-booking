import { BookingStatus } from '@app/generated/prisma/enums';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
