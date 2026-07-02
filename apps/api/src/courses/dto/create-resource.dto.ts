import { IsOptional, IsString } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  title: string;

  @IsString()
  fileType: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileSizeLabel?: string;
}
