import { IsOptional, IsString } from 'class-validator';

export class CreateEmailLogDto {
  @IsString()
  @IsOptional()
  resendEmailId?: string;

  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  toEmail: string;

  @IsString()
  subject: string;

  @IsString()
  jobName: string;
}
