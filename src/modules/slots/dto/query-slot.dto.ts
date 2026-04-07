import { IsDateString, IsOptional, IsEnum, IsString } from 'class-validator';
import { SlotStatus } from '@app/generated/prisma/enums';

export class QuerySlotDto {
  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
