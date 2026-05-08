import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty()
  @IsUrl({
    host_whitelist: ['localhost', 'example.com'],
  })
  @IsNotEmpty()
  successUrl: string;

  @ApiProperty()
  @IsUrl({
    host_whitelist: ['localhost', 'example.com'],
  })
  @IsNotEmpty()
  cancelUrl: string;
}
