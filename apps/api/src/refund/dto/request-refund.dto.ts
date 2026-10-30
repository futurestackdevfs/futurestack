import { IsString, IsNumber, IsOptional, Min, MinLength } from 'class-validator';

/**
 * A support agent asking for a refund. Nothing is paid out until an admin
 * approves it (and the agent can cancel it until then).
 */
export class RequestRefundDto {
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  /** Defaults to what the student paid for the item; may be lower, never higher. */
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @IsString()
  @MinLength(5)
  reason: string;

  /** Support ticket this refund is raised from - shown on the admin Refunds screen. */
  @IsString()
  @IsOptional()
  ticketId?: string;
}
