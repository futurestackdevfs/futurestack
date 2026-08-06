import { IsOptional, IsString } from 'class-validator';

export class RejectTrainerDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
