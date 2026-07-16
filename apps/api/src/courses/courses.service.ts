import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { FeatureDto } from './dto/feature.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== PUBLIC ====================

  async featuredCourses() {
    const courses = await this.prisma.course.findMany({
      where: { isFeatured: true, status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        price: true,
        techStack: true,
        displayOrder: true,
        trainer: { select: { name: true } },
        _count: { select: { sections: true } },
        sections: { select: { _count: { select: { videos: true } } } },
      },
    });
    // Prisma can't count videos directly on Course, so we aggregate from sections.
    return courses.map(({ sections, ...rest }) => ({
      ...rest,
      totalVideos: sections.reduce((sum, s) => sum + s._count.videos, 0),
    }));
  }

  async featuredTracks() {
    return this.prisma.track.findMany({
      where: { isFeatured: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        displayOrder: true,
        _count: { select: { courses: true } },
      },
    });
  }

  async getCourseOverview(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, status: 'ACTIVE' },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            yearsExperience: true,
            rating: true,
            _count: { select: { coursesTaught: true } }
          }
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                durationSeconds: true,
                order: true,
                isPreview: true,   // only preview videos are playable without enrollment
              }
            },
            quizzes: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, order: true, totalQuestions: true }
            }
          }
        },
        _count: { select: { enrollments: true } }
      }
    });

    if (!course) throw new NotFoundException('Course not found');

    // Compute totals
    const totalVideos = course.sections.reduce((sum, s) => sum + s.videos.length, 0);
    const totalQuizzes = course.sections.reduce((sum, s) => sum + s.quizzes.length, 0);
    const totalDurationSecs = course.sections.reduce(
      (sum, s) => sum + s.videos.reduce((vs, v) => vs + v.durationSeconds, 0), 0
    );
    const totalHours = Math.round((totalDurationSecs / 3600) * 10) / 10;

    // Build curriculum — merge videos and quizzes per section by order
    // Videos that are NOT isPreview should have their id omitted — 
    // visitors shouldn't be able to guess video IDs for OTP requests
    const curriculum = course.sections.map(section => ({
      id: section.id,
      title: section.title,
      order: section.order,
      totalItems: section.videos.length + section.quizzes.length,
      items: [
        ...section.videos.map(v => ({
          type: 'video' as const,
          id: v.isPreview ? v.id : null,   // only expose ID for preview videos
          title: v.title,
          durationSeconds: v.durationSeconds,
          order: v.order,
          isPreview: v.isPreview,
          isLocked: !v.isPreview,
        })),
        ...section.quizzes.map(q => ({
          type: 'quiz' as const,
          id: null,                          // quiz IDs never exposed to unenrolled users
          title: q.title,
          totalQuestions: q.totalQuestions,
          order: q.order,
          isPreview: false,
          isLocked: true,
        }))
      ].sort((a, b) => a.order - b.order)
    }));

    return {
      id: course.id,
      title: course.title,
      code: course.code,
      category: course.category,
      skillLevel: course.skillLevel,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      price: course.price,
      whatYoullLearn: course.whatYoullLearn,
      techStack: course.techStack,
      careerTitle: course.careerTitle,
      careerBody: course.careerBody,
      totalVideos,
      totalQuizzes,
      totalHours,
      totalSections: course.sections.length,
      enrollmentCount: course._count.enrollments,
      instructor: course.trainer ? {
        id: course.trainer.id,
        name: course.trainer.name,
        avatarUrl: course.trainer.avatarUrl,
        bio: course.trainer.bio,
        yearsExperience: course.trainer.yearsExperience,
        rating: course.trainer.rating,
        coursesTaughtCount: course.trainer._count.coursesTaught,
      } : null,
      curriculum,
    };
  }

  async searchCourses(query: {
    q?: string;
    category?: string;
    skillLevel?: string;
    limit?: number;
  }) {
    const limit = Math.min(query.limit ?? 10, 50); // cap at 50
  
    const where: any = {
      status: 'ACTIVE',
      ...(query.category && { category: query.category }),
      ...(query.skillLevel && { skillLevel: query.skillLevel }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          { category: { contains: query.q, mode: 'insensitive' } },
          { techStack: { has: query.q } },
        ]
      })
    };
  
    const courses = await this.prisma.course.findMany({
      where,
      take: limit,
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        code: true,
        category: true,
        skillLevel: true,
        description: true,
        thumbnailUrl: true,
        price: true,
        isFeatured: true,
        techStack: true,
        _count: { select: { enrollments: true } },
        trainer: { select: { id: true, name: true, avatarUrl: true } },
        sections: {
          select: {
            _count: { select: { videos: true } }
          }
        }
      }
    });
  
    return {
      query: query.q ?? null,
      total: courses.length,
      results: courses.map(c => ({
        id: c.id,
        title: c.title,
        code: c.code,
        category: c.category,
        skillLevel: c.skillLevel,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        price: c.price,
        isFeatured: c.isFeatured,
        techStack: c.techStack,
        enrollmentCount: c._count.enrollments,
        totalVideos: c.sections.reduce((sum, s) => sum + s._count.videos, 0),
        trainer: c.trainer ?? null,
      }))
    };
  }

  // ==================== FEATURE + REORDER ====================

  async featureCourse(id: string, dto: FeatureDto) {
    await this.findCourseOrFail(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async featureTrack(id: string, dto: FeatureDto) {
    await this.findTrackOrFail(id);
    return this.prisma.track.update({ where: { id }, data: dto });
  }

  async reorderFeaturedCourses(dto: ReorderItemsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.course.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return { message: 'Courses reordered' };
  }

  async reorderFeaturedTracks(dto: ReorderItemsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.track.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return { message: 'Tracks reordered' };
  }

  // ==================== TRACKS ====================

  async createTrack(dto: CreateTrackDto) {
    return this.prisma.track.create({ data: dto });
  }

  async listTracks() {
    return this.prisma.track.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTrack(id: string, dto: UpdateTrackDto) {
    await this.findTrackOrFail(id);
    return this.prisma.track.update({ where: { id }, data: dto });
  }

  async deleteTrack(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: { _count: { select: { courses: true } } },
    });
    if (!track) throw new NotFoundException('Track not found');
    if (track._count.courses > 0) {
      throw new ConflictException(
        `Cannot delete this track — it still has ${track._count.courses} linked course(s). Unlink them first.`,
      );
    }
    await this.prisma.track.delete({ where: { id } });
    return { message: 'Track deleted' };
  }

  private async findTrackOrFail(id: string) {
    const track = await this.prisma.track.findUnique({ where: { id } });
    if (!track) throw new NotFoundException('Track not found');
    return track;
  }

  // ==================== COURSES ====================

  async createCourse(dto: CreateCourseDto) {
    if (dto.trainerId) await this.validateApprovedTrainer(dto.trainerId);
    const course = await this.prisma.course.create({ data: dto });

    // Build a 2-4 letter prefix from category initials, e.g. "Full Stack" → "FS"
    const prefix = dto.category
      ? dto.category.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 4)
      : 'CRS';

    const existingCount = await this.prisma.course.count({
      where: { code: { startsWith: `${prefix}-` } },
    });
    const code = `${prefix}-${String(existingCount + 1).padStart(2, '0')}`;

    return this.prisma.course.update({ where: { id: course.id }, data: { code } });
  }

  async listCourses() {
    return this.prisma.course.findMany({
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, sections: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        trainer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        resources: { orderBy: { createdAt: 'asc' } },
        tracks: { include: { track: { select: { id: true, title: true } } } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: { orderBy: { order: 'asc' } },
            quizzes: { orderBy: { order: 'asc' } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    await this.findCourseOrFail(id);
    if (dto.trainerId !== undefined) await this.validateApprovedTrainer(dto.trainerId);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deleteCourse(id: string) {
    await this.findCourseOrFail(id);
    const activeCount = await this.prisma.enrollment.count({
      where: { courseId: id, status: 'active' },
    });
    if (activeCount > 0) {
      throw new ConflictException(
        `Cannot delete this course — it has ${activeCount} active enrollment(s).`,
      );
    }
    await this.prisma.course.delete({ where: { id } });
    return { message: 'Course deleted' };
  }

  async linkCourseToTrack(courseId: string, trackId: string) {
    await this.findCourseOrFail(courseId);
    await this.findTrackOrFail(trackId);
    try {
      return await this.prisma.trackCourse.create({ data: { courseId, trackId } });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('This course is already linked to that track');
      }
      throw e;
    }
  }

  async unlinkCourseFromTrack(courseId: string, trackId: string) {
    try {
      await this.prisma.trackCourse.delete({
        where: { trackId_courseId: { trackId, courseId } },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException('This course is not linked to that track');
      }
      throw e;
    }
    return { message: 'Course unlinked from track' };
  }

  private async findCourseOrFail(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // Rejects if the user is not an APPROVED TRAINER. Called on create and
  // on update whenever trainerId is explicitly included in the request body.
  private async validateApprovedTrainer(trainerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: trainerId } });
    if (!user || user.role !== Role.TRAINER) {
      throw new BadRequestException(
        `User ${trainerId} is not a trainer`,
      );
    }
    if (user.approvalStatus !== 'APPROVED') {
      throw new BadRequestException(
        `Trainer must be approved before being assigned to a course (current status: ${user.approvalStatus?.toLowerCase() ?? 'unknown'})`,
      );
    }
  }

  // ==================== SECTIONS ====================

  async createSection(courseId: string, dto: CreateSectionDto) {
    await this.findCourseOrFail(courseId);
    return this.prisma.section.create({ data: { ...dto, courseId } });
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    await this.findSectionOrFail(id);
    return this.prisma.section.update({ where: { id }, data: dto });
  }

  async deleteSection(id: string) {
    await this.findSectionOrFail(id);
    await this.prisma.section.delete({ where: { id } });
    return { message: 'Section deleted' };
  }

  private async findSectionOrFail(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  // ==================== VIDEOS ====================

  async createVideo(sectionId: string, dto: CreateVideoDto) {
    await this.findSectionOrFail(sectionId);
    return this.prisma.video.create({ data: { ...dto, sectionId } });
  }

  async updateVideo(id: string, dto: UpdateVideoDto) {
    await this.findVideoOrFail(id);
    return this.prisma.video.update({ where: { id }, data: dto });
  }

  async deleteVideo(id: string) {
    await this.findVideoOrFail(id);
    await this.prisma.video.delete({ where: { id } });
    return { message: 'Video deleted' };
  }

  private async findVideoOrFail(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  // ==================== QUIZZES ====================

  async createQuiz(sectionId: string, dto: CreateQuizDto) {
    await this.findSectionOrFail(sectionId);
    return this.prisma.quiz.create({ data: { ...dto, sectionId } });
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    await this.findQuizOrFail(id);
    return this.prisma.quiz.update({ where: { id }, data: dto });
  }

  async deleteQuiz(id: string) {
    await this.findQuizOrFail(id);
    await this.prisma.quiz.delete({ where: { id } });
    return { message: 'Quiz deleted' };
  }

  private async findQuizOrFail(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  // ==================== RESOURCES ====================

  async createResource(courseId: string, dto: CreateResourceDto) {
    await this.findCourseOrFail(courseId);
    return this.prisma.courseResource.create({ data: { ...dto, courseId } });
  }

  async deleteResource(id: string) {
    const resource = await this.prisma.courseResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');
    await this.prisma.courseResource.delete({ where: { id } });
    return { message: 'Resource deleted' };
  }
}
