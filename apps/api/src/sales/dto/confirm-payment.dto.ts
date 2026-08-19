import { IsIn, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsIn(['UPI', 'Card', 'Net Banking', 'Cash', 'Other'])
  paymentMethod?: 'UPI' | 'Card' | 'Net Banking' | 'Cash' | 'Other';
}
