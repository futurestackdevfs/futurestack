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

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  reason: string;
}
