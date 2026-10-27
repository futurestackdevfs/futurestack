import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  /** Optional — defaults to exactly what the student paid for the item (after
   *  coupon, GST included). May be lower for a partial refund, never higher. */
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @IsString()
  reason: string;
}
