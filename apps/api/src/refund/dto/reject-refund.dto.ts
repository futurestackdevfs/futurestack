import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRefundDto {
  /** Why the refund was turned down — shown to the support agent on the ticket. */
  @IsString()
  @IsOptional()
  @MaxLength(300)
  reason?: string;
}
