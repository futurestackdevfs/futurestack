import { IsInt, Min } from 'class-validator';

export class UpdateVideoProgressDto {
  @IsInt()
  @Min(0)
  positionSec: number;
}