import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalQuestions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  // Only used when creating a standalone quiz (no section route param) —
  // course-owned quizzes get sectionId from the route instead.
  @IsOptional()
  @IsString()
  sectionId?: string;
}
