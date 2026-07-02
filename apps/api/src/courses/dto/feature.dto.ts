import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class FeatureDto {
  @IsBoolean()
  isFeatured: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
