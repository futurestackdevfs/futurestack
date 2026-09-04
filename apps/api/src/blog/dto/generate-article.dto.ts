import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateArticleDto {
  /** Optional topic. If omitted, a trending Hacker News story is used. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;
}
