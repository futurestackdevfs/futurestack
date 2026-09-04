import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAgentMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  attachmentUrl?: string;

  // true = staff-only internal note (never shown to the student, no email)
  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;
}
