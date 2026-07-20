import { IsString, IsNotEmpty, IsUUID, IsInt } from 'class-validator';

export class UploadVideoDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string; // e.g. "video/mp4"

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUUID()
  sectionId: string;

  @IsInt()
  order: number;
}
