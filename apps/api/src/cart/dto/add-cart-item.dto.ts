import { IsString, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  @IsUUID()
  courseId: string;
}
