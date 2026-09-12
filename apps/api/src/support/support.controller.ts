import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PageSizePipe } from '../common/page-size.pipe';
import { Role, TicketStatus } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAgentMessageDto } from './dto/create-agent-message.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

interface ReqUser {
  id: string;
  role: Role;
}

@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // ─── STUDENT (any authenticated user; ownership checked in service) ───

  @Auth()
  @Post('tickets')
  createTicket(@Req() req: Request, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(req.user as ReqUser, dto);
  }

  @Auth()
  @Get('tickets')
  listMine(
    @Req() req: Request,
    @Query('status') status: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    const user = req.user as ReqUser;
    return this.support.listMine(user.id, {
      status: status ? (status as TicketStatus) : undefined,
      page,
      limit: Math.min(limit, 50),
    });
  }

  @Auth()
  @Get('tickets/:id')
  getThread(@Req() req: Request, @Param('id') id: string) {
    return this.support.getThread(id, req.user as ReqUser);
  }

  @Auth()
  @Post('tickets/:id/messages')
  addMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.support.addStudentMessage(id, req.user as ReqUser, dto);
  }

  @Auth()
  @Patch('tickets/:id/close')
  close(@Req() req: Request, @Param('id') id: string) {
    return this.support.closeOwn(id, req.user as ReqUser);
  }

  // ─── AGENT (SUPPORT + ADMIN) ─────────────────────────────────────────

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/tickets')
  staffList(
    @Query('status') status: string,
    @Query('priority') priority: string,
    @Query('category') category: string,
    @Query('assigneeId') assigneeId: string,
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    return this.support.staffList({
      status,
      priority,
      category,
      assigneeId,
      q,
      page,
      limit: Math.min(limit, 50),
    });
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/stats')
  staffStats() {
    return this.support.staffStats();
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/agents')
  staffAgents() {
    return this.support.staffAgents();
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/tickets/:id')
  staffGetThread(@Req() req: Request, @Param('id') id: string) {
    return this.support.getThread(id, req.user as ReqUser);
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Post('staff/tickets/:id/messages')
  staffAddMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateAgentMessageDto,
  ) {
    return this.support.staffAddMessage(id, req.user as ReqUser, dto);
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Patch('staff/tickets/:id')
  staffUpdate(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.support.staffUpdate(id, dto);
  }

  // ─── AGENT — student directory / 360° enrollment profile ────────────

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/students')
  listStudents(
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    return this.support.listStudents({
      q,
      page,
      limit: Math.min(limit, 50),
      enrolledOnly: true,
    });
  }

  // Every student, enrolled or not — the general "Students" directory.
  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/all-students')
  listAllStudents(
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    return this.support.listStudents({
      q,
      page,
      limit: Math.min(limit, 50),
      enrolledOnly: false,
    });
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/students/:id/profile')
  getStudentProfile(@Param('id') id: string) {
    return this.support.getStudentProfile(id);
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Post('staff/students/:id/send-password-reset')
  sendStudentPasswordReset(
    @Param('id') id: string,
    @Body('email') email?: string,
  ) {
    return this.support.sendStudentPasswordReset(id, email);
  }

  // ─── AGENT — ratings & reviews (per course / per project) ───────────

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/ratings')
  listRatingSubjects(
    @Query('type') type: 'course' | 'project',
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    return this.support.listRatingSubjects({
      type: type === 'project' ? 'project' : 'course',
      q,
      page,
      limit: Math.min(limit, 50),
    });
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/ratings/:type/:id')
  getRatingDetail(
    @Param('type') type: 'course' | 'project',
    @Param('id') id: string,
  ) {
    return this.support.getRatingDetail(
      type === 'project' ? 'project' : 'course',
      id,
    );
  }

  // ─── AGENT — payments (READ-ONLY — no mutation routes on purpose) ───

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/payments')
  staffListPayments(
    @Query('status') status: string,
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    return this.support.staffListPayments({
      status,
      q,
      page,
      limit: Math.min(limit, 50),
    });
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/payments/stats')
  staffPaymentStats() {
    return this.support.staffPaymentStats();
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/payments/:id')
  getPaymentDetail(@Param('id') id: string) {
    return this.support.getPaymentDetail(id);
  }

  // ─── AGENT — raw support-inbox reader (every real email, ticket or not) ──

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/inbox/threads')
  listInboxThreads(
    @Query('q') q: string,
    @Query('limit', new PageSizePipe(30, 100)) limit: number,
    @Query('pageToken') pageToken: string,
  ) {
    return this.support.listInboxThreads({
      q,
      limit: Math.min(limit, 100),
      pageToken,
    });
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('staff/inbox/threads/:id')
  getInboxThread(@Param('id') id: string) {
    return this.support.getInboxThread(id);
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Post('staff/inbox/threads/:id/reply')
  replyInInboxThread(@Param('id') id: string, @Body('body') body: string) {
    return this.support.replyInInboxThread(id, body);
  }
}
