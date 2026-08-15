import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UploadVideoDto } from './dto/upload-video.dto';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { VdoCipherWebhookPayload } from './dto/vdocipher-webhook.dto';
import { UpdateTrainerShareDto } from './dto/update-trainer-share.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vdoCipherService: VdoCipherService,
  ) {}

  async listAllTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        yearsExperience: true,
        rating: true,
        avatarUrl: true,
        approvalStatus: true,
        isActive: true,
        createdAt: true,
        _count: { select: { coursesTaught: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return trainers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      bio: t.bio,
      yearsExperience: t.yearsExperience,
      rating: t.rating,
      avatarUrl: t.avatarUrl,
      approvalStatus: t.approvalStatus ?? 'PENDING',
      isActive: t.isActive,
      createdAt: t.createdAt,
      coursesTaught: t._count.coursesTaught,
      totalStudents: t._count.enrollments,
    }));
  }

  async listPendingTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER, approvalStatus: 'PENDING' },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        yearsExperience: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }, // oldest applications first
    });

    return trainers;
  }

  async approveTrainer(trainerId: string) {
    const trainer = await this.findPendingTrainer(trainerId);

    const updated = await this.prisma.user.update({
      where: { id: trainer.id },
      data: { approvalStatus: 'APPROVED' },
    });

    return {
      message: `${updated.name} has been approved as a trainer.`,
      trainerId: updated.id,
    };
  }

  async rejectTrainer(trainerId: string, _reason?: string) {
    const trainer = await this.findPendingTrainer(trainerId);

    const updated = await this.prisma.user.update({
      where: { id: trainer.id },
      data: { approvalStatus: 'REJECTED' },
    });

    // TODO: once a notification system exists, email the trainer with
    // the rejection reason instead of silently dropping it.

    return {
      message: `${updated.name}'s trainer application has been rejected.`,
      trainerId: updated.id,
    };
  }

  private async findPendingTrainer(trainerId: string) {
    const trainer = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });

    if (!trainer || trainer.role !== Role.TRAINER) {
      throw new NotFoundException('Trainer not found');
    }

    if (
      trainer.approvalStatus === 'APPROVED' ||
      trainer.approvalStatus === 'REJECTED'
    ) {
      throw new ConflictException(
        `This trainer's application has already been ${trainer.approvalStatus.toLowerCase()}`,
      );
    }

    return trainer;
  }

  async listApprovedTrainers() {
    return this.prisma.user.findMany({
      where: { role: Role.TRAINER, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        yearsExperience: true,
        rating: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { coursesTaught: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPlatformStats() {
    const [
      totalCourses,
      activeCourses,
      draftCourses,
      totalTracks,
      totalTrainers,
      pendingTrainers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
    ] = await this.prisma.$transaction([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { status: 'DRAFT' } }),
      this.prisma.track.count(),
      this.prisma.user.count({
        where: { role: Role.TRAINER, approvalStatus: 'APPROVED' },
      }),
      this.prisma.user.count({
        where: { role: Role.TRAINER, approvalStatus: 'PENDING' },
      }),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: 'active' } }),
    ]);

    return {
      totalCourses,
      activeCourses,
      draftCourses,
      totalTracks,
      totalTrainers,
      pendingTrainers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
    };
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        avatarUrl: true,
        approvalStatus: true,
        trainerSharePercent: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { enrollments: true, coursesTaught: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin directly creates a Coordinator, Support, or Admin account.
   * Unlike trainer self-registration, this account is immediately usable —
   * the admin has already vetted the person by choosing to create it.
   */
  async createStaffAccount(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role,
        // Admin-created trainers are pre-approved — no pending review needed
        ...(dto.role === 'TRAINER' && { approvalStatus: 'APPROVED' }),
      },
    });

    return {
      message: `${user.name} has been created as ${dto.role}.`,
      userId: user.id,
    };
  }

  /**
   * Sets/clears a per-trainer share override (% the trainer keeps). A null
   * value resets to the global PaymentSettings default. Refuses once the
   * trainer has any revenue ledger entries — the split is locked in once
   * money starts flowing.
   */
  async updateTrainerShare(id: string, dto: UpdateTrainerShareDto) {
    const trainer = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!trainer || trainer.role !== Role.TRAINER) {
      throw new NotFoundException('Trainer not found');
    }

    const hasRevenue = await this.prisma.revenueLedger.count({
      where: { trainerId: id },
    });
    if (hasRevenue > 0) {
      throw new ConflictException(
        'Cannot change revenue split after revenue has been generated',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { trainerSharePercent: dto.trainerSharePercent ?? null },
    });

    return {
      message: 'Revenue split updated',
      trainerSharePercent: dto.trainerSharePercent,
    };
  }

  async getVideoUploadCredentials(dto: UploadVideoDto) {
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Re-upload: delete old VdoCipher video, update existing DB record
    if (dto.videoId) {
      const existing = await this.prisma.video.findUnique({
        where: { id: dto.videoId },
      });
      if (existing) {
        await this.vdoCipherService.deleteVideo(existing.vdoCipherId);
      }
    }

    const { vdoCipherId, uploadUrl, uploadCredentials } =
      await this.vdoCipherService.getUploadCredentials(dto.title);

    const video = dto.videoId
      ? await this.prisma.video.update({
          where: { id: dto.videoId },
          data: {
            title: dto.title,
            vdoCipherId,
            durationSeconds: 0,
            videoStatus: 'UPLOADING',
          },
        })
      : await this.prisma.video.create({
          data: {
            title: dto.title,
            sectionId: dto.sectionId,
            order: dto.order,
            vdoCipherId,
            durationSeconds: 0,
            videoStatus: 'UPLOADING',
          },
        });

    return {
      videoId: video.id,
      vdoCipherId,
      uploadUrl,
      uploadCredentials,
    };
  }

  async getVideoStatus(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        videoStatus: true,
        durationSeconds: true,
        vdoCipherId: true,
      },
    });

    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async handleVdoCipherWebhook(payload: VdoCipherWebhookPayload) {
    this.logger.log(
      `Webhook received: ${payload.event} for video ${payload.payload.id}`,
    );

    switch (payload.event) {
      case 'video:ready':
        return this.handleVideoReady(payload);
      case 'video:updated':
        return this.handleVideoUpdated(payload);
      case 'video:deleted':
        return this.handleVideoDeleted(payload);
      case 'video:error':
        return this.handleVideoError(payload);
      case 'caption:ready':
        return this.handleCaptionReady(payload);
      case 'caption:deleted':
        return this.handleCaptionDeleted(payload);
      case 'poster:ready':
        return this.handlePosterReady(payload);
      default:
        this.logger.warn(`Unknown webhook event: ${payload.event}`);
        return { received: true };
    }
  }

  private async handleVideoReady(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    await this.prisma.video.update({
      where: { id: video.id },
      data: {
        videoStatus: 'READY',
        ...(payload.payload.length
          ? { durationSeconds: payload.payload.length }
          : {}),
      },
    });

    this.logger.log(`Video ${video.id} marked as READY`);
    return { received: true };
  }

  private async handleVideoUpdated(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    await this.prisma.video.update({
      where: { id: video.id },
      data: {
        ...(payload.payload.title ? { title: payload.payload.title } : {}),
        ...(payload.payload.length
          ? { durationSeconds: payload.payload.length }
          : {}),
      },
    });

    this.logger.log(`Video ${video.id} metadata updated`);
    return { received: true };
  }

  private async handleVideoDeleted(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    await this.prisma.video.update({
      where: { id: video.id },
      data: { videoStatus: 'UPLOADING' },
    });

    this.logger.log(
      `Video ${video.id} reset to UPLOADING after deletion on VdoCipher`,
    );
    return { received: true };
  }

  private async handleVideoError(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    await this.prisma.video.update({
      where: { id: video.id },
      data: { videoStatus: 'FAILED' },
    });

    this.logger.error(
      `Video ${video.id} failed: ${payload.payload.error ?? 'Unknown error'}`,
    );
    return { received: true };
  }

  private async handleCaptionReady(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    this.logger.log(
      `Caption ready for video ${video.id}: language=${payload.payload.language}, captionId=${payload.payload.captionId}`,
    );

    return { received: true };
  }

  private async handleCaptionDeleted(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    this.logger.log(
      `Caption deleted for video ${video.id}: language=${payload.payload.language}, captionId=${payload.payload.captionId}`,
    );

    return { received: true };
  }

  private async handlePosterReady(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    this.logger.log(
      `Poster ready for video ${video.id}: ${payload.payload.posterUrl ?? 'N/A'}`,
    );

    return { received: true };
  }
}
