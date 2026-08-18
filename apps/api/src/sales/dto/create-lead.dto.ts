import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export const LEAD_STATUSES = [
  'New',
  'Interested',
  'Converted',
  'Dropped',
] as const;

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: 'New' | 'Interested' | 'Converted' | 'Dropped';

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsISO8601()
  nextFollowUp?: string;

  @IsOptional()
  @IsISO8601()
  lastContact?: string;
}
