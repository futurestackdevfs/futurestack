import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, Header, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { Audit } from '../audit/audit.decorator';
import { VdoCipherWebhookGuard } from './vdocipher-webhook.guard';
import { clampPageSize } from '../common/page-size.pipe';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RejectTrainerDto } from './dto/reject-trainer.dto';
import { UpdateTrainerShareDto } from './dto/update-trainer-share.dto';
import { UploadVideoDto } from './dto/upload-video.dto';
import { VdoCipherWebhookPayload } from './dto/vdocipher-webhook.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Auth(Role.ADMIN)
  @Get('audit-logs')
  async listAuditLogs(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.audit.list({
      page: Math.max(1, parseInt(page ?? '1') || 1),
      perPage: clampPageSize(perPage, 50, 100),
      action,
      entityType,
      entityId,
    });
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER, Role.COORDINATOR)
  @Get('stats')
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  // Trainer approval is content-management work — shared with Content Manager.
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER, Role.COORDINATOR)
  @Get('trainers')
  async listAllTrainers() {
    return this.adminService.listAllTrainers();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER, Role.COORDINATOR)
  @Get('trainers/pending')
  async listPendingTrainers() {
    return this.adminService.listPendingTrainers();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER, Role.COORDINATOR)
  @Get('trainers/approved')
  async listApprovedTrainers() {
    return this.adminService.listApprovedTrainers();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'APPROVE', entity: 'Trainer' })
  @Post('trainers/:id/approve')
  async approveTrainer(@Param('id') id: string) {
    return this.adminService.approveTrainer(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'REJECT', entity: 'Trainer' })
  @Post('trainers/:id/reject')
  async rejectTrainer(
    @Param('id') id: string,
    @Body() dto: RejectTrainerDto,
  ) {
    return this.adminService.rejectTrainer(id, dto.reason);
  }

  // Account provisioning stays ADMIN-only — a Content Manager shouldn't be

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
  @Audit({ action: 'CREATE', entity: 'Staff', idFrom: 'response' })
  @Post('staff')
  async createStaffAccount(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaffAccount(dto);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Get('users')
  async listAllUsers() {
    return this.adminService.listAllUsers();
  }

  @Auth(Role.ADMIN)
  @Get('search')
  async globalSearch(@Query('q') q?: string) {
    return this.adminService.globalSearch(q ?? '');
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'User', meta: { field: 'password' } })
  @Post('users/:id/regenerate-password')
  async regeneratePassword(@Param('id') id: string) {
    return this.adminService.regeneratePassword(id);
  }

  @Auth(Role.ADMIN)
  @Get('sales-dashboard')
  async getSalesDashboard() {
    return this.adminService.getSalesDashboard();
  }

  // Revenue split is money configuration — ADMIN-only, can't be changed after
  // revenue has been generated for the trainer.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'Trainer', meta: { field: 'revenueShare' } })
  @Patch('trainers/:id/share')
  async updateTrainerShare(
    @Param('id') id: string,
    @Body() dto: UpdateTrainerShareDto,
  ) {
    return this.adminService.updateTrainerShare(id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('videos/upload-credentials')
  async getVideoUploadCredentials(@Body() dto: UploadVideoDto) {
    return this.adminService.getVideoUploadCredentials(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('videos/:videoId/status')
  async getVideoStatus(@Param('videoId') videoId: string) {
    return this.adminService.getVideoStatus(videoId);
  }

  // NO @Auth here — VdoCipher can't present a user JWT. Instead the request
  // must carry the shared VDOCIPHER_WEBHOOK_SECRET (x-vdocipher-secret header,
  // Authorization header, or ?secret= query), verified by VdoCipherWebhookGuard.
  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/vdocipher-webhook')
  async handleVdoCipherWebhook(@Body() payload: VdoCipherWebhookPayload) {
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  // ── ENROLLMENT MANAGEMENT ────────────────────────────────────────

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Get('enrollments')
  async listEnrollments(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('q') q?: string,
  ) {
    return this.adminService.listEnrollments(
      Math.max(1, parseInt(page ?? '1') || 1),
      clampPageSize(perPage, 20, 100),
      q,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
  @Audit({ action: 'CREATE', entity: 'Enrollment', idFrom: 'response' })
  @Post('enrollments')
  async manualEnroll(
    @Body() dto: { studentId: string; courseId: string; amountPaid: number },
  ) {
    return this.adminService.manualEnroll(dto.studentId, dto.courseId, dto.amountPaid);
  }

  @Auth(Role.ADMIN)
  @Audit({ action: 'DELETE', entity: 'Enrollment' })
  @Delete('enrollments/:id')
  async unenroll(@Param('id') id: string) {
    return this.adminService.unenroll(id);
  }

  // ── CSV EXPORTS ──────────────────────────────────────────────────

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Get('reports/revenue.csv')
  @Header('Content-Type', 'text/csv')
  async exportRevenueCsv(@Res() res: Response) {
    const csv = await this.adminService.exportRevenueCsv();
    res.setHeader('Content-Disposition', 'attachment; filename="revenue-report.csv"');
    res.send(csv);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Get('reports/leads.csv')
  @Header('Content-Type', 'text/csv')
  async exportLeadsCsv(@Res() res: Response) {
    const csv = await this.adminService.exportLeadsCsv();
    res.setHeader('Content-Disposition', 'attachment; filename="leads-report.csv"');
    res.send(csv);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Get('reports/conversions.csv')
  @Header('Content-Type', 'text/csv')
  async exportConversionsCsv(@Res() res: Response) {
    const csv = await this.adminService.exportConversionsCsv();
    res.setHeader('Content-Disposition', 'attachment; filename="conversions-report.csv"');
    res.send(csv);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-ready')
  async handleVideoReady(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:ready';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-updated')
  async handleVideoUpdated(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:updated';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-deleted')
  async handleVideoDeleted(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:deleted';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-error')
  async handleVideoError(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:error';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/caption-ready')
  async handleCaptionReady(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'caption:ready';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/caption-deleted')
  async handleCaptionDeleted(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'caption:deleted';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @UseGuards(VdoCipherWebhookGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/poster-ready')
  async handlePosterReady(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'poster:ready';
    return this.adminService.handleVdoCipherWebhook(payload);
  }
}
