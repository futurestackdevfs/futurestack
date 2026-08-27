import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CurriculumVideoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  vdoCipherId?: string;

  @IsOptional()
  @IsInt()
  durationSeconds?: number;
}

export class CurriculumItemDto {
  @IsString()
  week: string;

  @IsString()
  title: string;

  @IsString()
  desc: string;

  @IsOptional()
  @IsArray()
  videos?: CurriculumVideoDto[];
}

export class UpdateCurriculumDto {
  @IsArray()
  items: CurriculumItemDto[];
}
