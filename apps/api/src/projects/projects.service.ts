import { Injectable, NotFoundException, ConflictException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { parseStoredRoadmap } from '../courses/courses.service';
import { AiProviderError } from '../ai/ai.errors';
import { AuditActor } from '../audit/audit.service';
import { ProjectRoadmapService, RoadmapJob, RoadmapVideoLinkUpdate } from './roadmap/project-roadmap.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly vdoCipherService: VdoCipherService,
    private readonly roadmapService: ProjectRoadmapService,
  ) {}

  /** Starts background roadmap generation for a project; returns a job id right away. */
  startRoadmapGeneration(projectId: string, actor?: AuditActor): { jobId: string } {
    try {
      return this.roadmapService.start(projectId, actor);
    } catch (err) {
      if (err instanceof AiProviderError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          error: 'Roadmap Generation Failed',
          message: err.message,
          reason: err.code,
          retryable: err.retryable,
        });
      }
      throw err;
    }
  }

  getRoadmapGeneration(jobId: string): RoadmapJob {
    const job = this.roadmapService.getJob(jobId);
    if (!job) throw new NotFoundException('Roadmap generation job not found or expired');
    return job;
  }

  cancelRoadmapGeneration(jobId: string): { cancelled: true } {
    this.roadmapService.cancel(jobId);
    return { cancelled: true };
  }

  updateRoadmapVideoLinks(projectId: string, updates: RoadmapVideoLinkUpdate[], actor?: AuditActor) {
    return this.roadmapService.updateVideoLinks(projectId, updates, actor);
  }

  updateRoadmapContent(projectId: string, roadmap: unknown, actor?: AuditActor) {
    return this.roadmapService.updateContent(projectId, roadmap, actor);
  }

  // ── PUBLIC ──────────────────────────────────────────────────────

  /** Converts Project's Decimal money columns to plain numbers right at the
   *  DB read boundary, so JSON responses keep serializing numbers instead of
   *  Decimal strings. */
  private toPlainProject<
    T extends {
      price: { toNumber(): number };
      originalPrice: { toNumber(): number } | null;
      priceUsd: { toNumber(): number } | null;
      originalPriceUsd: { toNumber(): number } | null;
    },
  >(project: T) {
    return {
      ...project,
      price: project.price.toNumber(),
      originalPrice: project.originalPrice?.toNumber() ?? null,
      priceUsd: project.priceUsd?.toNumber() ?? null,
      originalPriceUsd: project.originalPriceUsd?.toNumber() ?? null,
    };
  }

  async listActive() {
    const projects = await this.prisma.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            careerPath: true,
            avatarUrl: true,
            yearsExperience: true,
            rating: true,
          },
        },
        curriculum: {
          orderBy: { order: 'asc' },
          include: { videos: { orderBy: { order: 'asc' }, select: { id: true, isPreview: true, durationSeconds: true } } },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return projects.map((p) => ({ ...this.toPlainProject(p), roadmap: parseStoredRoadmap(p.roadmap) }));
  }

  async getById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            careerPath: true,
            avatarUrl: true,
            yearsExperience: true,
            rating: true,
          },
        },
        curriculum: {
          orderBy: { order: 'asc' },
          include: { videos: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { orderItems: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return { ...this.toPlainProject(project), roadmap: parseStoredRoadmap(project.roadmap) };
  }

  // ── ADMIN ───────────────────────────────────────────────────────

  async listAll() {
    const projects = await this.prisma.project.findMany({
      include: {
        trainer: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { curriculum: true, orderItems: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return projects.map((p) => this.toPlainProject(p));
  }

  async create(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A project with this name already exists');

    // Validate trainerId if provided
    if (dto.trainerId) {
      const trainer = await this.prisma.user.findUnique({ where: { id: dto.trainerId } });
      if (!trainer) throw new BadRequestException('Trainer not found');
    }

    const created = await this.prisma.project.create({
      data: {
        name: dto.name,
        image: dto.image ?? null,
        techLabel: dto.techLabel ?? '',
        tech: dto.tech ?? '',
        shortDesc: dto.shortDesc ?? '',
        overview: dto.overview ?? '',
        thumbGradient: dto.thumbGradient ?? 'linear-gradient(135deg,#0d1f3c,#0a2a1a)',
        level: dto.level,
        badge: dto.badge ?? '',
        duration: dto.duration ?? '',
        sessions: dto.sessions ?? '',
        seats: dto.seats ?? 0,
        price: dto.price,
        originalPrice: dto.originalPrice,
        priceUsd: dto.priceUsd,
        originalPriceUsd: dto.originalPriceUsd,
        category: dto.category,
        stack: dto.stack ?? [],
        highlights: dto.highlights ?? [],
        prereqs: dto.prereqs ?? [],
        includes: dto.includes ?? [],
        industryUse: dto.industryUse ?? '',
        tools: dto.tools ?? [],
        setupSteps: dto.setupSteps ?? [],
        demoVideoUrl: dto.demoVideoUrl,
        walkthroughVideoUrl: dto.walkthroughVideoUrl,
        trainerId: dto.trainerId,
        status: dto.status ?? 'DRAFT',
        isFeatured: dto.isFeatured ?? false,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
    return this.toPlainProject(created);
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.getById(id);

    // Validate trainerId if provided
    if (dto.trainerId) {
      const trainer = await this.prisma.user.findUnique({ where: { id: dto.trainerId } });
      if (!trainer) throw new BadRequestException('Trainer not found');
    }

    const data: Record<string, any> = {};
    const fields = [
      'name', 'image', 'techLabel', 'tech', 'shortDesc', 'overview',
      'thumbGradient', 'level', 'badge', 'duration', 'sessions', 'seats',
      'price', 'originalPrice', 'priceUsd', 'originalPriceUsd', 'category', 'industryUse', 'demoVideoUrl',
      'walkthroughVideoUrl', 'trainerId', 'status', 'isFeatured', 'displayOrder',
    ];
    for (const f of fields) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f];
    }
    const arrayFields = ['stack', 'highlights', 'prereqs', 'includes', 'tools', 'setupSteps'];
    for (const f of arrayFields) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f];
    }

    const updated = await this.prisma.project.update({ where: { id }, data });
    return this.toPlainProject(updated);
  }

  async delete(id: string) {
    const project = await this.getById(id);
    await this.prisma.project.delete({ where: { id } });
    if (project.image) {
      try {
        await this.s3Service.deleteByUrl(project.image);
      } catch {}
    }
    return { message: 'Project deleted' };
  }

  async replaceCurriculum(id: string, dto: UpdateCurriculumDto) {
    await this.getById(id);

    // Delete all existing curriculum (videos cascade delete)
    await this.prisma.projectCurriculum.deleteMany({ where: { projectId: id } });

    if (dto.items.length === 0) return { success: true };

    // Exactly one video across the whole curriculum is ever the free
    // preview, and it must always land pinned first — first curriculum item,
    // first video in that item — regardless of where the admin actually
    // placed it (drag-reordered items, added it mid-list, etc). Public
    // playback assumes "first video of the first item", so this reorders the
    // incoming payload itself before saving rather than trusting client
    // order. Mirrors the same server-side repositioning courses.service.ts
    // does for Course videos in updateVideo().
    let items = dto.items.map((item) => ({ ...item, videos: item.videos ? [...item.videos] : [] }));

    let previewItemIndex = -1;
    let previewVideoIndex = -1;
    for (let i = 0; i < items.length && previewItemIndex === -1; i++) {
      const videos = items[i].videos;
      for (let j = 0; j < videos.length; j++) {
        if (videos[j].isPreview) {
          previewItemIndex = i;
          previewVideoIndex = j;
          break;
        }
      }
    }

    if (previewItemIndex > 0) {
      const [item] = items.splice(previewItemIndex, 1);
      items = [item, ...items];
      previewItemIndex = 0;
    }
    if (previewItemIndex === 0 && previewVideoIndex > 0) {
      const videos = items[0].videos;
      const [video] = videos.splice(previewVideoIndex, 1);
      items[0] = { ...items[0], videos: [video, ...videos] };
    }
    const hasExplicitPreview = previewItemIndex !== -1;
    let previewAssigned = false;

    // Create curriculum items with videos
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const curriculum = await this.prisma.projectCurriculum.create({
        data: {
          projectId: id,
          week: item.week,
          title: item.title,
          desc: item.desc,
          order: i,
        },
      });

      if (item.videos && item.videos.length > 0) {
        await this.prisma.projectCurriculumVideo.createMany({
          data: item.videos.map((v, vi) => {
            // Only the very first video of the (now-first) item is ever the
            // preview — also defends against more than one video incorrectly
            // flagged isPreview in the incoming payload.
            const isPreview = hasExplicitPreview ? i === 0 && vi === 0 : !previewAssigned;
            if (isPreview) previewAssigned = true;
            return {
              curriculumId: curriculum.id,
              title: v.title,
              vdoCipherId: v.vdoCipherId || null,
              durationSeconds: v.durationSeconds || 0,
              isPreview,
              order: vi,
            };
          }),
        });
      }
    }

    return { success: true, count: items.length };
  }

  // ── DEMO VIDEO UPLOAD ────────────────────────────────────────────

  async getDemoVideoUploadCredentials(id: string, title: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const { vdoCipherId, uploadUrl, uploadCredentials } =
      await this.vdoCipherService.getUploadCredentials(title);

    return {
      vdoCipherId,
      uploadUrl,
      uploadCredentials,
    };
  }

  async completeDemoVideoUpload(id: string, vdoCipherId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    // Store the VdoCipher embed URL for proper video playback
    const demoVideoUrl = `https://iframe.vdocipher.com/v2/${vdoCipherId}`;

    await this.prisma.project.update({
      where: { id },
      data: { demoVideoUrl },
    });

    return { success: true, demoVideoUrl, vdoCipherId };
  }

  // ── CURRICULUM VIDEO UPLOAD ─────────────────────────────────────

  async getCurriculumVideoUploadCredentials(projectId: string, dto: { curriculumId: string; title: string; filename: string; videoId?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const curriculum = await this.prisma.projectCurriculum.findUnique({
      where: { id: dto.curriculumId },
    });
    if (!curriculum) throw new NotFoundException('Curriculum item not found');
    if (curriculum.projectId !== projectId) throw new NotFoundException('Curriculum item does not belong to this project');

    // Re-upload: delete old VdoCipher video if exists
    if (dto.videoId) {
      const existing = await this.prisma.projectCurriculumVideo.findUnique({
        where: { id: dto.videoId },
      });
      if (existing && existing.vdoCipherId) {
        try {
          await this.vdoCipherService.deleteVideo(existing.vdoCipherId);
        } catch {}
      }
    }

    const { vdoCipherId, uploadUrl, uploadCredentials } =
      await this.vdoCipherService.getUploadCredentials(dto.title);

    const video = dto.videoId
      ? await this.prisma.projectCurriculumVideo.update({
          where: { id: dto.videoId },
          data: {
            title: dto.title,
            vdoCipherId,
            durationSeconds: 0,
          },
        })
      : await this.prisma.projectCurriculumVideo.create({
          data: {
            curriculumId: dto.curriculumId,
            title: dto.title,
            vdoCipherId,
            durationSeconds: 0,
            order: await this.prisma.projectCurriculumVideo.count({
              where: { curriculumId: dto.curriculumId },
            }),
          },
        });

    return {
      videoId: video.id,
      vdoCipherId,
      uploadUrl,
      uploadCredentials,
    };
  }

  async completeCurriculumVideoUpload(projectId: string, videoId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const video = await this.prisma.projectCurriculumVideo.findUnique({
      where: { id: videoId },
    });
    if (!video) throw new NotFoundException('Video not found');

    return { success: true, videoId: video.id, vdoCipherId: video.vdoCipherId };
  }

  // ── PROJECT ORDERS ──────────────────────────────────────────────

  async createOrder(projectId: string, dto: {
    studentName?: string;
    studentEmail?: string;
    studentPhone?: string;
    amount: number;
    paymentMethod?: string;
  }, studentId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const { randomUUID } = await import('crypto');
    const orderId = randomUUID();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: orderId,
          userId: studentId || '',
          currency: 'INR',
          gatewayType: 'DOMESTIC',
          subtotal: dto.amount,
          discountAmount: 0,
          gstPercent: 0,
          gstAmount: 0,
          totalAmount: dto.amount,
          razorpayOrderId: `MANUAL-${orderId}`,
          razorpayPaymentId: null,
          billingFullName: dto.studentName || 'Anonymous',
          billingEmail: dto.studentEmail || '',
          billingPhone: dto.studentPhone || '',
        },
      });
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          projectId,
          priceAtPurchase: dto.amount,
          currency: 'INR',
          status: 'active',
        },
      });
      return created;
    });

    return order;
  }

  async listOrders(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.order.findMany({
      where: {
        items: { some: { projectId } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { where: { projectId }, select: { id: true, status: true, priceAtPurchase: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listAllOrders() {
    return this.prisma.order.findMany({
      where: {
        items: { some: { projectId: { not: null } } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          where: { projectId: { not: null } },
          include: { project: { select: { id: true, name: true } } },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    // Update the project OrderItem's status within the Order
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { orderId, projectId: { not: null } },
    });
    if (!orderItem) throw new NotFoundException('Project order item not found');

    return this.prisma.orderItem.update({
      where: { id: orderItem.id },
      data: { status },
    });
  }

  // ── CURRICULUM SECTION / VIDEO CRUD ────────────────────────────

  async addSection(projectId: string, dto: { week: string; title: string; desc: string }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const maxOrder = await this.prisma.projectCurriculum.aggregate({
      where: { projectId },
      _max: { order: true },
    });

    return this.prisma.projectCurriculum.create({
      data: {
        projectId,
        week: dto.week || '',
        title: dto.title,
        desc: dto.desc || '',
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  async deleteSection(sectionId: string) {
    const section = await this.prisma.projectCurriculum.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    await this.prisma.projectCurriculum.delete({ where: { id: sectionId } });
    return { success: true };
  }

  async addVideo(sectionId: string, dto: { title: string; vdoCipherId?: string; durationSeconds?: number; isPreview?: boolean }) {
    const section = await this.prisma.projectCurriculum.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    const maxOrder = await this.prisma.projectCurriculumVideo.aggregate({
      where: { curriculumId: sectionId },
      _max: { order: true },
    });

    return this.prisma.projectCurriculumVideo.create({
      data: {
        curriculumId: sectionId,
        title: dto.title,
        vdoCipherId: dto.vdoCipherId || null,
        durationSeconds: dto.durationSeconds || 0,
        isPreview: dto.isPreview || false,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  async deleteVideo(videoId: string) {
    const video = await this.prisma.projectCurriculumVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    await this.prisma.projectCurriculumVideo.delete({ where: { id: videoId } });
    return { success: true };
  }

  /** Mirrors CoursesService.updateVideo's isPreview handling: the
   *  upload-credentials endpoint that actually creates a ProjectCurriculumVideo
   *  row never knows about isPreview (it's a purely local-UI flag until now),
   *  so this is called right after a flagged-as-preview video finishes
   *  uploading to persist it — forcing it to the front of the project's first
   *  curriculum item and clearing isPreview on every other video, so it can
   *  never drift out of the "first video of the first item" position that
   *  public playback will eventually assume. */
  async updateCurriculumVideo(videoId: string, dto: { title?: string; isPreview?: boolean }) {
    const video = await this.prisma.projectCurriculumVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    if (dto.isPreview === true) {
      const curriculum = await this.prisma.projectCurriculum.findUnique({ where: { id: video.curriculumId }, select: { projectId: true } });
      const firstItem = curriculum
        ? await this.prisma.projectCurriculum.findFirst({ where: { projectId: curriculum.projectId }, orderBy: { order: 'asc' } })
        : null;

      if (firstItem) {
        const lowest = await this.prisma.projectCurriculumVideo.aggregate({ where: { curriculumId: firstItem.id }, _min: { order: true } });
        const newOrder = Math.min(lowest._min.order ?? 0, video.curriculumId === firstItem.id ? video.order : 0) - 1;

        await this.prisma.projectCurriculumVideo.updateMany({
          where: { curriculum: { projectId: curriculum!.projectId }, isPreview: true, id: { not: videoId } },
          data: { isPreview: false },
        });
        return this.prisma.projectCurriculumVideo.update({
          where: { id: videoId },
          data: { ...dto, curriculumId: firstItem.id, order: newOrder },
        });
      }
    }

    return this.prisma.projectCurriculumVideo.update({ where: { id: videoId }, data: dto });
  }

  async getCurriculumVideoStatus(videoId: string) {
    const video = await this.prisma.projectCurriculumVideo.findUnique({
      where: { id: videoId },
      select: { id: true, title: true, videoStatus: true, durationSeconds: true, vdoCipherId: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  /** Admin/content-manager preview — same idea as CoursesService.getAdminVideoOtp,
   *  just against ProjectCurriculumVideo. Skips any public-preview gating since
   *  staff should be able to spot-check any uploaded video. */
  async getAdminCurriculumVideoOtp(videoId: string) {
    const video = await this.prisma.projectCurriculumVideo.findUnique({
      where: { id: videoId },
      select: { vdoCipherId: true, videoStatus: true },
    });
    if (!video || !video.vdoCipherId) throw new NotFoundException('Video not found');
    if (video.videoStatus !== 'READY') throw new BadRequestException('Video not ready for preview yet');

    return this.vdoCipherService.getPlaybackOtp(video.vdoCipherId, {
      name: 'Admin Preview',
      email: 'preview@futurestack.in',
    });
  }

  /** Public, unauthenticated preview playback — mirrors CoursesService's
   *  getPublicVideoOtp exactly: only the video that is both flagged isPreview
   *  AND literally the first video of literally the first curriculum item of
   *  an ACTIVE project is ever playable without login/enrollment. */
  async getPublicCurriculumVideoOtp(videoId: string) {
    const video = await this.prisma.projectCurriculumVideo.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        vdoCipherId: true,
        videoStatus: true,
        isPreview: true,
        order: true,
        curriculum: {
          select: {
            id: true,
            projectId: true,
            project: { select: { status: true } },
          },
        },
      },
    });

    if (!video) throw new NotFoundException('Video not available for preview');
    if (video.videoStatus !== 'READY') throw new BadRequestException('Video not ready');
    if (!video.curriculum?.project || video.curriculum.project.status !== 'ACTIVE')
      throw new NotFoundException('Video not available');
    if (!video.isPreview) throw new NotFoundException('Video not available for preview');

    const firstItem = await this.prisma.projectCurriculum.findFirst({
      where: { projectId: video.curriculum.projectId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (video.curriculum.id !== firstItem?.id) throw new NotFoundException('Video not available for preview');

    const firstVideo = await this.prisma.projectCurriculumVideo.findFirst({
      where: { curriculumId: video.curriculum.id },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (video.id !== firstVideo?.id) throw new NotFoundException('Video not available for preview');

    if (!video.vdoCipherId) throw new NotFoundException('Video not available for preview');
    return this.vdoCipherService.getPlaybackOtp(video.vdoCipherId, {
      name: 'Preview User',
      email: 'preview@futurestack.in',
    });
  }
}
