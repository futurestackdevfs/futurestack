import {
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { SkillLevel } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dob?: string; // ISO string — stored as DateTime in DB

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  qualification?: string;

  @IsOptional()
  @IsEnum(SkillLevel)
  experience?: SkillLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  careerPath?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
