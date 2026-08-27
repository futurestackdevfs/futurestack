import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CourseStatus, SkillLevel } from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  techLabel?: string;

  @IsOptional()
  @IsString()
  tech?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SkillLevel)
  level?: SkillLevel;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsString()
  shortDesc?: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stack?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prereqs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includes?: string[];

  @IsOptional()
  @IsString()
  industryUse?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  setupSteps?: string[];

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  sessions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seats?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  thumbGradient?: string;

  @IsOptional()
  @IsString()
  demoVideoUrl?: string;

  @IsOptional()
  @IsString()
  walkthroughVideoUrl?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
