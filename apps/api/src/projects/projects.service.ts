import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
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
        curriculum: { orderBy: { order: 'asc' } },
        _count: { select: { orders: true } },
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
        _count: { select: { curriculum: true, orders: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A project with this name already exists');

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

    await this.prisma.projectCurriculum.deleteMany({ where: { projectId: id } });

    if (dto.items.length === 0) return { success: true };

    await this.prisma.projectCurriculum.createMany({
      data: dto.items.map((item, i) => ({
        projectId: id,
        week: item.week,
        title: item.title,
        desc: item.desc,
        order: i,
      })),
    });

    return { success: true, count: dto.items.length };
  }
}
