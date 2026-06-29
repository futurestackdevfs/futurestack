import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Deliberately restricted — STUDENT and TRAINER each have their own
  // dedicated signup flow and shouldn't be provisionable through this
  // generic "admin creates staff" endpoint.
  @IsIn(['COORDINATOR', 'SUPPORT', 'ADMIN', 'CONTENT_MANAGER'])
  role: 'COORDINATOR' | 'SUPPORT' | 'ADMIN' | 'CONTENT_MANAGER';
}