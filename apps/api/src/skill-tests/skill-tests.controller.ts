import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { SkillTestsService } from './skill-tests.service';
import { CreateSkillTestDto } from './dto/create-skill-test.dto';
import { UpdateSkillTestDto } from './dto/update-skill-test.dto';
import { CreateSkillTestQuestionDto } from './dto/create-skill-test-question.dto';
import { UpdateSkillTestQuestionDto } from './dto/update-skill-test-question.dto';
import { SubmitSkillTestDto } from './dto/submit-skill-test.dto';
import { Audit } from '../audit/audit.decorator';

// IMPORTANT — route ordering: static-prefix routes (public, questions, mine)
// must be declared before the bare @Get(':id') / @Patch(':id') / @Delete(':id')
// handlers, same convention as CoursesController.

@Controller('skill-tests')
export class SkillTestsController {
  constructor(private readonly skillTestsService: SkillTestsService) {}

  // ================================================================
  // PUBLIC / STUDENT
  // ================================================================

  @Get('public')
  listActive() {
    return this.skillTestsService.listActive();
  }

  @Auth(Role.STUDENT)
  @Get('mine')
  myAttempts(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.skillTestsService.myAttempts(user.id);
  }

  @Auth(Role.STUDENT)
  @Get('public/:id')
  getForAttempt(@Param('id') id: string) {
    return this.skillTestsService.getForAttempt(id);
  }

  @Auth(Role.STUDENT)
  @Post('public/:id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitSkillTestDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.skillTestsService.submit(user.id, id, dto);
  }

  // ================================================================
  // ADMIN — course-owned skill test
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('by-course/:courseId')
  getByCourse(@Param('courseId') courseId: string) {
    return this.skillTestsService.getByCourse(courseId);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'CREATE', entity: 'SkillTest', idFrom: 'response' })
  @Post('by-course/:courseId')
  getOrCreateByCourse(
    @Param('courseId') courseId: string,
    @Body('defaultTitle') defaultTitle: string,
  ) {
    return this.skillTestsService.getOrCreateByCourse(courseId, defaultTitle);
  }

  // ================================================================
  // QUESTIONS — nested under a skill test id
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':skillTestId/questions')
  addQuestion(
    @Param('skillTestId') skillTestId: string,
    @Body() dto: CreateSkillTestQuestionDto,
  ) {
    return this.skillTestsService.addQuestion(skillTestId, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateSkillTestQuestionDto) {
    return this.skillTestsService.updateQuestion(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.skillTestsService.deleteQuestion(id);
  }

  // ================================================================
  // ADMIN / CONTENT-MANAGER — skill test CRUD
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'CREATE', entity: 'SkillTest', idFrom: 'response' })
  @Post()
  create(@Body() dto: CreateSkillTestDto) {
    return this.skillTestsService.create(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get()
  listAll() {
    return this.skillTestsService.listAll();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.skillTestsService.getOne(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'UPDATE', entity: 'SkillTest' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSkillTestDto) {
    return this.skillTestsService.update(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'DELETE', entity: 'SkillTest' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skillTestsService.remove(id);
  }
}
