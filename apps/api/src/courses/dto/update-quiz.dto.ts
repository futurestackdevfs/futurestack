import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  // 0 is a valid value here too — see CreateQuizDto for why this isn't Min(1).
  @IsOptional()
  @IsInt()
  @Min(0)
  totalQuestions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsString()
  sectionId?: string;
}
