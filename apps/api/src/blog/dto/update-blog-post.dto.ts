import { IsString, IsArray, IsOptional, MinLength, IsIn } from 'class-validator';

export class UpdateBlogPostDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  content?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  metaDescription?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  slug?: string;

  @IsIn(['draft', 'published'])
  @IsOptional()
  status?: string;
}
