import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTrackDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSequential?: boolean;
}
