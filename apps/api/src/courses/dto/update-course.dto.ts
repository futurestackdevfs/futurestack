import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourseStatus, SkillLevel } from '@prisma/client';

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

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;
}
