import { IsString, IsOptional } from 'class-validator';

export class CreateHeroSlideDto {
  @IsString()
  title: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;
}
