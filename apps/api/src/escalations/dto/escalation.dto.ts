import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EscalationSeverity, EscalationStatus } from '@prisma/client';

export class CreateEscalationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  reason!: string;

  @IsOptional()
  @IsEnum(EscalationSeverity)
  severity?: EscalationSeverity;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class UpdateEscalationDto {
  @IsOptional()
  @IsEnum(EscalationStatus)
  status?: EscalationStatus;

  @IsOptional()
  @IsEnum(EscalationSeverity)
  severity?: EscalationSeverity;

  /** A user id to assign, or null to unassign. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assigneeId?: string | null;

  /** Required when moving to RESOLVED — the note shown to everyone afterwards. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class EscalationCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note!: string;
}

export const BULK_ACTIONS = ['RESOLVE', 'DISMISS', 'ASSIGN'] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

export class BulkEscalationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsEnum(BULK_ACTIONS)
  action!: BulkAction;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class UpdateEscalationSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  ticketSlaHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  refundPendingHours?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  paidGraceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  complaintMinCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  complaintWindowDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  coordinatorSlaDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  ticketAutoCloseDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  resolveSlaHours?: number;

  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;
}
