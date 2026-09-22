import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(0)
  order: number;

  // 0 is a valid initial value — a quiz is created empty and questions are
  // authored into it afterward (see SkillTestBuilder/CurriculumBuilder),
  // so this can't require at least 1 or quiz creation itself would fail.
  @IsOptional()
  @IsInt()
  @Min(0)
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
