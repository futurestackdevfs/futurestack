import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSkillTestQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
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
