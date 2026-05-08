import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSlotDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  serviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  capacity?: number = 1;
}
