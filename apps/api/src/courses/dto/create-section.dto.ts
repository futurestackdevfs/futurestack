import { IsInt, IsString, Min } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(0)
  order: number;
}
