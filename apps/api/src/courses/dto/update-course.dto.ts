import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CourseStatus, SkillLevel } from '@prisma/client';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  code?: string;

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

  // See CreateCourseDto.careerPath. Passing "" clears the course's track;
  // omitting it leaves the current track untouched.
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
