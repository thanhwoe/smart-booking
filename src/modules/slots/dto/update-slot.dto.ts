import { SlotStatus } from '@app/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateSlotDto {
  @ApiProperty({
    enum: SlotStatus,
    description: 'Slot status',
    example: SlotStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(SlotStatus)
  status: SlotStatus;
}
