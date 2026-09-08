import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsIn(['business', 'trainer', 'other'])
  type: 'business' | 'trainer' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message: string;

  /** Honeypot — real users never fill this hidden field; bots do. */
  @IsOptional()
  @IsString()
  @MaxLength(0, { message: 'Spam detected' })
  website?: string;
}
