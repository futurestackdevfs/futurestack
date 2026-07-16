import { IsInt, Min, Max } from 'class-validator';

export class SubmitQuizDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score: number; // percentage, e.g. 85
}
