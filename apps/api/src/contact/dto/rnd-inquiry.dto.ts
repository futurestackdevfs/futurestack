import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RndInquiryDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;
}
