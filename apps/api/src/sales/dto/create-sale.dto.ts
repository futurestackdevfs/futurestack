import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSaleDto {
  /** true = new student (account created), false = link to existing studentId */
  @IsOptional()
  @IsBoolean()
  isNewStudent?: boolean;

  /** Required when isNewStudent=false — an existing student id */
  @IsOptional()
  @IsUUID()
  studentId?: string;

  /** Optional — an active lead owned by this salesperson to auto-convert + link on sale */
  @IsOptional()
  @IsUUID()
  leadId?: string;

  /** When true, the receipt + login details are emailed straight to the student */
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  // New-student fields (required when isNewStudent=true)
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  // Sale details
  @IsString()
  @IsUUID()
  courseId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPct!: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsIn(['Online', 'Offline'])
  batchMode!: 'Online' | 'Offline';

  @IsIn(['UPI', 'Card', 'Net Banking', 'Cash', 'Other'])
  paymentMethod!: 'UPI' | 'Card' | 'Net Banking' | 'Cash' | 'Other';
}
