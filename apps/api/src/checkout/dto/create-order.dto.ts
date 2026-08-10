import { IsEmail, IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @Matches(/^[0-9]{10,15}$/, { message: 'phone must be 10-15 digits' })
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

  @Matches(/^[0-9]{5,6}$/, { message: 'pincode must be 5-6 digits' })
  pincode: string;
}
