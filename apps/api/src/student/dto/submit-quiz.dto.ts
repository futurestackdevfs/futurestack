import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerDto {
  @IsString()
  questionId: string;

  // One or more selected option indices — a single-answer question submits
  // exactly one, a multi-select question can submit several.
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  selectedIndices: number[];
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
