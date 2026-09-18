import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuizQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correctIndex: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsInt()
  @Min(0)
  order: number;
}
