import { IsString, IsOptional } from 'class-validator';

export class UpdateRefundDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
