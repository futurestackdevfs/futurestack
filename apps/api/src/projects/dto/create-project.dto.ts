import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CourseStatus, SkillLevel } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  @IsNotEmpty()
  techLabel: string;

  @IsString()
  @IsNotEmpty()
  tech: string;

  @IsString()
  @IsNotEmpty()
  shortDesc: string;

  @IsString()
  @IsNotEmpty()
  overview: string;

  @IsOptional()
  @IsString()
  thumbGradient?: string;

  @IsEnum(SkillLevel)
  level: SkillLevel;

  @IsOptional()
  @IsString()
  badge?: string;

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

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  category?: string;

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
  demoVideoUrl?: string;

  @IsOptional()
  @IsString()
  walkthroughVideoUrl?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsEnum(CourseStatus)
  status: CourseStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
