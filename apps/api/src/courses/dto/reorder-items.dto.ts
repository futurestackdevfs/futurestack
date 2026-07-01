import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class ReorderItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class ReorderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
