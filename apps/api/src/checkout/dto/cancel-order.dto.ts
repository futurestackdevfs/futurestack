import { IsString } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  razorpayOrderId: string;
}
