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

  @IsIn(['TRAINER', 'COORDINATOR', 'SUPPORT', 'ADMIN', 'CONTENT_MANAGER', 'SALES'])
  role: 'TRAINER' | 'COORDINATOR' | 'SUPPORT' | 'ADMIN' | 'CONTENT_MANAGER' | 'SALES';
}
