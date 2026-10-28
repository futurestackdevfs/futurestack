import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { Audit } from '../audit/audit.decorator';
import { EscalationsService } from './escalations.service';
import { EscalationScanService } from './escalation-scan.service';
import {
  BulkEscalationDto,
  CreateEscalationDto,
  EscalationCommentDto,
  UpdateEscalationDto,
  UpdateEscalationSettingsDto,
} from './dto/escalation.dto';

function actorOf(req: Request) {
  const user = req.user as { id: string; name?: string | null };
  return { id: user.id, name: user.name ?? null };
}

function toInt(v: string | undefined): number | undefined {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
}

@Controller('admin/escalations')
@Auth(Role.ADMIN)
export class EscalationsController {
  constructor(
    private readonly escalations: EscalationsService,
    private readonly scanner: EscalationScanService,
  ) {}

  @Get()
  list(@Req() req: Request, @Query() query: Record<string, string>) {
    return this.escalations.list({
      status: query.status,
      type: query.type,
      severity: query.severity,
      // "mine" = assigned to whoever is asking.
      assigneeId: query.assignee === 'me' ? actorOf(req).id : query.assignee,
      q: query.q,
      overdue: query.overdue === 'true',
      page: toInt(query.page),
      perPage: toInt(query.perPage),
    });
  }

  // Static routes first — they must not be swallowed by ':id'.

  @Get('summary')
  summary() {
    return this.escalations.summary();
  }

  @Get('count')
  async count() {
    return { active: await this.escalations.activeCount() };
  }

  @Get('staff')
  staff() {
    return this.escalations.assignableStaff();
  }

  @Get('settings')
  getSettings() {
    return this.escalations.getSettings();
  }

  @Audit({ action: 'UPDATE', entity: 'EscalationSettings', idFrom: 'none' })
  @Patch('settings')
  updateSettings(@Body() dto: UpdateEscalationSettingsDto) {
    return this.escalations.updateSettings(dto);
  }

  @Post('scan')
  scan() {
    return this.scanner.scan();
  }

  @Post('bulk')
  bulk(@Req() req: Request, @Body() dto: BulkEscalationDto) {
    return this.escalations.bulk(dto, actorOf(req));
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateEscalationDto) {
    return this.escalations.createManual(dto, actorOf(req));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.escalations.get(id);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscalationDto,
  ) {
    return this.escalations.update(id, dto, actorOf(req));
  }

  @Post(':id/comments')
  comment(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EscalationCommentDto,
  ) {
    return this.escalations.addComment(id, dto.note, actorOf(req));
  }
}
