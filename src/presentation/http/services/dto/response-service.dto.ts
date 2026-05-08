import { Service } from '@app/generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResult, PaginationResponseDto } from '@app/utils/pagination';

export class ResponseServiceDto implements Service {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: Decimal;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ResponseServicesDto
  extends PaginationResponseDto
  implements PaginatedResult<Service>
{
  @ApiProperty({
    type: [ResponseServiceDto],
  })
  data: ResponseServiceDto[];
}
