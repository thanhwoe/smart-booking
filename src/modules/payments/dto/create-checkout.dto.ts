import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  successUrl: string;

  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  cancelUrl: string;
}
