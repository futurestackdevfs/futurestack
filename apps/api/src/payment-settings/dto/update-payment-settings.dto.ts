import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdatePaymentSettingsDto {
  @IsOptional()
  @IsBoolean()
  domesticEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  internationalEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  trainerSharePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercentUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  usdRate?: number;
}
