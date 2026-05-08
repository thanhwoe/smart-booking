import { ApiProperty } from '@nestjs/swagger';
import { Slot, SlotStatus } from '@app/generated/prisma/client';
import { PaginatedResult, PaginationResponseDto } from '@app/utils/pagination';

export class ResponseSlotDto implements Slot {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  bookedCount: number;

  @ApiProperty()
  status: SlotStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ResponseSlotsDto
  extends PaginationResponseDto
  implements PaginatedResult<Slot>
{
  @ApiProperty({
    type: [ResponseSlotDto],
  })
  data: Slot[];
}
