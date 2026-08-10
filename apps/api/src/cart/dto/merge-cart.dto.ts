import { IsArray, IsString, IsUUID } from 'class-validator';

export class MergeCartDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  courseIds: string[];
}
