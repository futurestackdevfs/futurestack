import { IsString, IsNotEmpty, IsUUID, IsInt, IsOptional } from 'class-validator';

export class UploadCurriculumVideoDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUUID()
  curriculumId: string;

  @IsInt()
  order: number;

  @IsOptional()
  @IsUUID()
  videoId?: string;
}
