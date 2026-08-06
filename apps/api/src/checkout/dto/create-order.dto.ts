import { IsEnum } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateOrderDto {
  @IsEnum(Currency)
  currency: Currency;
}
