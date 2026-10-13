import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateArticleDto {
  /** Optional topic. If omitted, a trending Hacker News story is used. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  /** Optional tags to focus the generated article around — admin-supplied. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}
