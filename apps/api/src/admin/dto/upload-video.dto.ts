import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  IsOptional,
} from 'class-validator';

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

  @IsOptional()
  @IsUUID()
  videoId?: string; // set when re-uploading an existing video
}
