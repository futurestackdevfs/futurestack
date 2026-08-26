import { IsArray, IsString } from 'class-validator';

export class CurriculumItemDto {
  @IsString()
  week: string;

  @IsString()
  title: string;

  @IsString()
  desc: string;
}

export class UpdateCurriculumDto {
  @IsArray()
  items: CurriculumItemDto[];
}
