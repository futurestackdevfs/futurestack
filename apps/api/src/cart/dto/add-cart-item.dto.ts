import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  projectId?: string;
}
