import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RejectTrainerDto } from './dto/reject-trainer.dto';
import { UpdateTrainerShareDto } from './dto/update-trainer-share.dto';
import { UploadVideoDto } from './dto/upload-video.dto';
import { VdoCipherWebhookPayload } from './dto/vdocipher-webhook.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  @Post('trainers/:id/approve')
  async approveTrainer(@Param('id') id: string) {
    return this.adminService.approveTrainer(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('trainers/:id/reject')
  async rejectTrainer(@Param('id') id: string, @Body() dto: RejectTrainerDto) {
    return this.adminService.rejectTrainer(id, dto.reason);
  }

  // Account provisioning stays ADMIN-only — a Content Manager shouldn't be

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
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

  // NO @Auth here — VdoCipher calls this without any token
  // Verified by checking the event payload and vdoCipherId existence instead
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
      parseInt(page ?? '1') || 1,
      parseInt(perPage ?? '20') || 20,
      q,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
  @Post('enrollments')
  async manualEnroll(
    @Body() dto: { studentId: string; courseId: string; amountPaid: number },
  ) {
    return this.adminService.manualEnroll(dto.studentId, dto.courseId, dto.amountPaid);
  }

  @Auth(Role.ADMIN)
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

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-ready')
  async handleVideoReady(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:ready';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-updated')
  async handleVideoUpdated(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:updated';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-deleted')
  async handleVideoDeleted(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:deleted';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/video-error')
  async handleVideoError(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'video:error';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/caption-ready')
  async handleCaptionReady(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'caption:ready';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/caption-deleted')
  async handleCaptionDeleted(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'caption:deleted';
    return this.adminService.handleVdoCipherWebhook(payload);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('videos/webhook/poster-ready')
  async handlePosterReady(@Body() payload: VdoCipherWebhookPayload) {
    payload.event = 'poster:ready';
    return this.adminService.handleVdoCipherWebhook(payload);
  }
}
