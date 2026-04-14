import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsUrl()
  @IsNotEmpty()
  successUrl: string;

  @IsUrl()
  @IsNotEmpty()
  cancelUrl: string;
}
