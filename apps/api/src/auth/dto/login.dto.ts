import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsIn(['student', 'ops'])
  portal?: 'student' | 'ops';
}
