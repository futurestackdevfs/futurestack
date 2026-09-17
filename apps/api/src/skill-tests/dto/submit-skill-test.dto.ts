import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class SkillTestAnswerDto {
  @IsString()
  questionId: string;

  @IsInt()
  @Min(0)
  selectedIndex: number;
}

export class SubmitSkillTestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillTestAnswerDto)
  answers: SkillTestAnswerDto[];
}
