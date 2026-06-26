import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { StudentService } from './student.service';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Auth(Role.STUDENT)
  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.studentService.getDashboard(user.id);
  }

  @Auth(Role.STUDENT)
  @Get('courses/:courseId')
  async getCourseDetail(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.studentService.getCourseDetail(user.id, courseId);
  }
}