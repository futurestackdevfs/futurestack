import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateJobPostingDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  duration?: string;

  // Empty string clears the field.
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  requirements?: string;

  @IsString()
  @IsOptional()
  skills?: string;
}
