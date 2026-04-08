import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
