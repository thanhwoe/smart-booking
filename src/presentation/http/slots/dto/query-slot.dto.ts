import { IsDateString, IsOptional, IsEnum, IsString } from 'class-validator';
import { SlotStatus } from '@app/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '@app/utils/pagination';

export class QuerySlotDto extends PaginationDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
