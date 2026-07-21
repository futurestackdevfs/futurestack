import { IsInt, IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { VideoStatus } from '@prisma/client';

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  vdoCipherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsEnum(VideoStatus)
  videoStatus?: VideoStatus;
}
