import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatYoullLearn?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @IsOptional()
  @IsString()
  careerTitle?: string;

  @IsOptional()
  @IsString()
  careerBody?: string;
}
