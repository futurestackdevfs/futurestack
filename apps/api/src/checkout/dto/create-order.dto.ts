import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @Matches(/^\+?[0-9]{8,15}$/, { message: 'phone must be 8-15 digits' })
  phone: string;

  @IsString()
  @MinLength(1)
  address: string;

  @IsString()
  @MinLength(1)
  city: string;

  @IsString()
  @MinLength(1)
  state: string;

  // Postal codes vary worldwide — India PIN is 6 digits, UK/CA/NL are
  // alphanumeric with spaces. Keep it permissive; the frontend enforces the
  // country-specific format.
  @Matches(/^[A-Za-z0-9 -]{3,12}$/, { message: 'enter a valid postal code' })
  pincode: string;

  // ISO 3166-1 alpha-2. Optional for backwards-compatibility; defaults to "IN".
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}
