import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  topic?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  // Loose bag from the guided wizard: { orderId?, courseId?, lessonId?, browser? }
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  attachmentUrl?: string;
}
