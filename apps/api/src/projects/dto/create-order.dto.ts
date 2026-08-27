import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProjectOrderDto {
  @IsOptional()
  @IsString()
  studentName?: string;

  @IsOptional()
  @IsString()
  studentEmail?: string;

  @IsOptional()
  @IsString()
  studentPhone?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
