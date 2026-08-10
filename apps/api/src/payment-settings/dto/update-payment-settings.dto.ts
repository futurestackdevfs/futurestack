import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @IsOptional()
  @IsBoolean()
  domesticEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  internationalEnabled?: boolean;
}
