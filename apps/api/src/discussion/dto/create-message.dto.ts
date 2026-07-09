import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { MessageTag } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @IsOptional()
  @IsEnum(MessageTag)
  tag?: MessageTag;

  @IsOptional()
  @IsUrl()
  attachmentUrl?: string;
}
