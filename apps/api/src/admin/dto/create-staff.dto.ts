import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  @Matches(/^[^@]+@(gmail|hotmail)\.com$/i, {
    message: 'email must be a Gmail or Hotmail address',
  })
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9.]*@futurestack\.co\.in$/i, {
    message: 'company email must be a valid @futurestack.co.in address',
  })
  companyId?: string;

  @IsIn(['TRAINER', 'COORDINATOR', 'SUPPORT', 'ADMIN', 'CONTENT_MANAGER', 'SALES'])
  role: 'TRAINER' | 'COORDINATOR' | 'SUPPORT' | 'ADMIN' | 'CONTENT_MANAGER' | 'SALES';
}