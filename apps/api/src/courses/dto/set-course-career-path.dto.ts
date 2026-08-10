import { IsOptional, IsString } from 'class-validator';

export class SetCourseCareerPathDto {
  @IsOptional()
  @IsString()
  title?: string;
}