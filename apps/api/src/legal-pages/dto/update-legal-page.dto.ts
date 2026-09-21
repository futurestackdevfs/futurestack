import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLegalPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  content: string;
}
