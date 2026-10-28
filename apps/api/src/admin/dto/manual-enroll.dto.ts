import { IsOptional, IsUUID } from 'class-validator';

/**
 * Gift enrollment: no amount — nothing is charged. Gift exactly one of a
 * course or a project (the service rejects both/neither).
 */
export class ManualEnrollDto {
  @IsUUID()
  studentId!: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
