import { IsString, IsArray, IsOptional, MinLength } from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsString()
  @MinLength(1)
  metaDescription!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  @IsOptional()
  sourceTopic?: string;
}
