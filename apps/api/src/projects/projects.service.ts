import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly vdoCipherService: VdoCipherService,
  ) {}

  // ── PUBLIC ──────────────────────────────────────────────────────

  async listActive() {
    return this.prisma.project.findMany({
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
        curriculum: { orderBy: { order: 'asc' } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
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
    return project;
  }

  // ── ADMIN ───────────────────────────────────────────────────────

  async listAll() {
    return this.prisma.project.findMany({
      include: {
        trainer: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { curriculum: true, orderItems: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A project with this name already exists');

    // Validate trainerId if provided
    if (dto.trainerId) {
      const trainer = await this.prisma.user.findUnique({ where: { id: dto.trainerId } });
      if (!trainer) throw new BadRequestException('Trainer not found');
    }

    return this.prisma.project.create({
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
      'price', 'originalPrice', 'category', 'industryUse', 'demoVideoUrl',
      'walkthroughVideoUrl', 'trainerId', 'status', 'isFeatured', 'displayOrder',
    ];
    for (const f of fields) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f];
    }
    const arrayFields = ['stack', 'highlights', 'prereqs', 'includes', 'tools', 'setupSteps'];
    for (const f of arrayFields) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f];
    }

    return this.prisma.project.update({ where: { id }, data });
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

    // Create curriculum items with videos
    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
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
          data: item.videos.map((v, vi) => ({
            curriculumId: curriculum.id,
            title: v.title,
            vdoCipherId: v.vdoCipherId || null,
            durationSeconds: v.durationSeconds || 0,
            order: vi,
          })),
        });
      }
    }

    return { success: true, count: dto.items.length };
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
}
