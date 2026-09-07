import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CourseStatus, SkillLevel } from '@prisma/client';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPriceUsd?: number;

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

  // Career path / learning track this course belongs to. If the track title
  // doesn't exist yet it's created; passing "" clears the course's track.
  // Handled via setCourseCareerPath(), not a column on Course.
  @IsOptional()
  @IsString()
  careerPath?: string;

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
