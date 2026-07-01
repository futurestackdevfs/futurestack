import { IsInt, IsString, Min } from 'class-validator';

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsString()
  vdoCipherId: string;

  @IsInt()
  @Min(1)
  durationSeconds: number;

  @IsInt()
  @Min(0)
  order: number;
}
