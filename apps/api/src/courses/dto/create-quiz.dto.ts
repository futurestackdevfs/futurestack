import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsInt()
  @Min(1)
  totalQuestions: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;
}
