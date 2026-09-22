import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuizQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  // One or more correct option indices — [i] for a single-answer question,
  // [i, j, ...] when isMultiSelect is true.
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  correctIndices: number[];

  @IsOptional()
  @IsBoolean()
  isMultiSelect?: boolean;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsInt()
  @Min(0)
  order: number;
}
