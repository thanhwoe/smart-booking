import { User, UserRole } from '@app/generated/prisma/client';
import { PaginatedResult, PaginationResponseDto } from '@app/utils/pagination';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseUserDto implements User {
  @ApiProperty()
  id: string;
  @ApiProperty()
  clerkId: string;
  @ApiProperty()
  email: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  phone: string;
  @ApiProperty()
  role: UserRole;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}

export class ResponseUsersDto
  extends PaginationResponseDto
  implements PaginatedResult<ResponseUserDto>
{
  @ApiProperty({
    type: [ResponseUserDto],
  })
  data: ResponseUserDto[];
}
