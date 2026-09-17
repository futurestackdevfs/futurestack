import { IsArray, IsInt, IsOptional, IsString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerDto {
  @IsString()
  questionId: string;

  @IsInt()
  selectedIndex: number;
}

export class SubmitQuizDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number; // percentage, e.g. 85 — legacy path, no linked skill test

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers?: QuizAnswerDto[];
}
