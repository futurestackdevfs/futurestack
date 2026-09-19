import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateJobPostingDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  duration!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
