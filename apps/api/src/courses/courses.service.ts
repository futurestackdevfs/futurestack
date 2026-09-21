import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { S3Service } from '../upload/s3.service';
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
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { FeatureDto } from './dto/feature.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { TTLCache } from '../common/ttl-cache';

const SKILL_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// DB values are sometimes stored as bare relative paths (e.g. "images/foo.png")
// which the browser resolves against the current page URL instead of the site
// root, causing 404s. Normalize to an absolute path/URL.
function normalizeThumbnail(
  url: string | null | undefined,
  fallback: string | null = null,
): string | null {
  if (!url) return fallback;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/')
  )
    return url;
  return `/${url}`;
}

/** Derived discount info from price + originalPrice. `originalPrice` null/<=price
 *  means no discount (offPct 0). The badge is computed, never stored. */
function discountInfo(
  price: number,
  originalPrice: number | null | undefined,
): { offPct: number; hasDiscount: boolean } {
  if (originalPrice != null && originalPrice > price && originalPrice > 0) {
    const offPct = Math.min(99, Math.round(((originalPrice - price) / originalPrice) * 100));
    return { offPct, hasDiscount: true };
  }
  return { offPct: 0, hasDiscount: false };
}

@Injectable()
export class CoursesService {
  // Public catalog is read far more often than it changes. Serve repeated
  // reads from memory and only touch the remote DB on cache miss / after edits.
  private readonly catalogCache = new TTLCache<any>(300_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vdoCipherService: VdoCipherService,
    private readonly s3Service: S3Service,
  ) {}

  // Cached-response key prefixes for the public course/track catalog. Hero
  // slides are tracked separately so a hero edit doesn't evict the whole
  // catalog (and vice versa).
  private static readonly CATALOG_PREFIXES = [
    'featured-courses',
    'featured-tracks',
    'track:',
    'slug:',
    'course:',
    'related:',
    'cards:',
    'overview:',
  ];

  /** Clears the cached course/track catalog responses — call after a course or track edit. */
  private invalidateCatalog(): void {
    for (const p of CoursesService.CATALOG_PREFIXES) {
      this.catalogCache.deleteByPrefix(p);
    }
  }

  /** Clears only the cached hero-slide response — call after a hero-slide edit. */
  private invalidateHero(): void {
    this.catalogCache.deleteByPrefix('hero-slides');
  }

  // ==================== PUBLIC ====================

  private async getVideoStats(
    courseIds: string[],
  ): Promise<Map<string, { totalSeconds: number; videoCount: number }>> {
    if (courseIds.length === 0) return new Map();
    const rows: {
      courseId: string;
      totalSeconds: number | null;
      videoCount: number | null;
    }[] = await this.prisma.$queryRawUnsafe(
      `SELECT s."courseId", COALESCE(SUM(v."durationSeconds"), 0) as "totalSeconds", COUNT(v.id) as "videoCount"
         FROM "Section" s LEFT JOIN "Video" v ON v."sectionId" = s."id"
         WHERE s."courseId" = ANY($1)
         GROUP BY s."courseId"`,
      courseIds,
    );
    const map = new Map<string, { totalSeconds: number; videoCount: number }>();
    for (const row of rows) {
      map.set(row.courseId, {
        totalSeconds: Number(row.totalSeconds ?? 0),
        videoCount: Number(row.videoCount ?? 0),
      });
    }
    return map;
  }

  async featuredCourses() {
    return this.catalogCache.getOrRefresh('featured-courses', () =>
      this.computeFeaturedCourses(),
    );
  }

  private async computeFeaturedCourses() {
    const SLOT_COUNT = 10;
    const courses = await this.prisma.course.findMany({
      where: {
        isFeatured: true,
        status: 'ACTIVE',
        displayOrder: { lt: SLOT_COUNT },
      },
      orderBy: { displayOrder: 'asc' },
      take: SLOT_COUNT,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        price: true,
        originalPrice: true,
        techStack: true,
        displayOrder: true,
        whatYoullLearn: true,
        careerTitle: true,
        careerBody: true,
        createdAt: true,
        trainer: { select: { name: true } },
        _count: { select: { sections: true, enrollments: true } },
      },
    });

    // Filter out duplicates in case of database inconsistencies
    const uniqueCourses: typeof courses = [];
    const seenOrders = new Set();
    for (const c of courses) {
      if (!seenOrders.has(c.displayOrder)) {
        seenOrders.add(c.displayOrder);
        uniqueCourses.push(c);
      }
    }

    const videoStats = await this.getVideoStats(uniqueCourses.map((c) => c.id));

    const enrollmentCounts = uniqueCourses
      .map((c) => c._count.enrollments)
      .sort((a, b) => b - a);
    const trendingThreshold =
      enrollmentCounts[Math.floor(enrollmentCounts.length * 0.2)] ?? 0;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const result = uniqueCourses.map(({ createdAt, ...rest }) => {
      const stats = videoStats.get(rest.id) ?? {
        totalSeconds: 0,
        videoCount: 0,
      };
      const isTrending =
        rest._count.enrollments > 0 &&
        rest._count.enrollments >= trendingThreshold;
      const isNew = createdAt >= fourteenDaysAgo;

      const price = rest.price.toNumber();
      const originalPrice = rest.originalPrice?.toNumber() ?? null;
      return {
        ...rest,
        price,
        originalPrice,
        thumbnailUrl: normalizeThumbnail(rest.thumbnailUrl),
        totalVideos: stats.videoCount,
        durationHours: Math.round(stats.totalSeconds / 3600) || 1,
        ...discountInfo(price, originalPrice),
        badge: null,
        badgeClass: '',
      };
    });
    return result;
  }

  async featuredTracks() {
    return this.catalogCache.getOrRefresh('featured-tracks', () =>
      this.computeFeaturedTracks(),
    );
  }

  private async computeFeaturedTracks() {
    const SLOT_COUNT = 10;
    const tracks = await this.prisma.track.findMany({
      where: {
        isFeatured: true,
        displayOrder: { lt: SLOT_COUNT },
      },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        displayOrder: true,
        _count: { select: { courses: true } },
      },
    });

    const uniqueTracks: typeof tracks = [];
    const seenOrders = new Set();
    for (const t of tracks) {
      if (!seenOrders.has(t.displayOrder)) {
        seenOrders.add(t.displayOrder);
        uniqueTracks.push(t);
      }
    }
    return uniqueTracks;
  }

  async trackCourses(id: string) {
    const CACHE_KEY = `track:${id}:courses`;
    const cached = this.catalogCache.get(CACHE_KEY);
    if (cached) return cached;

    const track = await this.prisma.track.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                techStack: true,
                price: true,
                originalPrice: true,
              },
            },
          },
          orderBy: { courseId: 'asc' },
        },
      },
    });
    if (!track) throw new NotFoundException('Track not found');
    const result = track.courses.map((tc) => tc.course);
    this.catalogCache.set(CACHE_KEY, result);
    return result;
  }

  async publicCourseBySlug(slug: string) {
    const CACHE_KEY = `slug:${slug}`;
    const cached = this.catalogCache.get(CACHE_KEY);
    if (cached) return cached;

    // Narrow to likely candidates in SQL (every slug word must appear in the
    // title, case-insensitive) instead of pulling the whole catalog, then
    // exact-match the slugified title.
    const words = slug.split('-').filter(Boolean);
    const courses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        ...(words.length > 0
          ? {
              AND: words.map((w) => ({
                title: { contains: w, mode: 'insensitive' as const },
              })),
            }
          : {}),
      },
      select: { id: true, title: true },
    });
    const matched = courses.find((c) => slugify(c.title) === slug);
    if (!matched) throw new NotFoundException('Course not found');
    const detail = await this.publicCourseDetail(matched.id);
    this.catalogCache.set(CACHE_KEY, detail);
    return detail;
  }

  async publicCourseDetail(id: string) {
    const CACHE_KEY = `course:${id}`;
    const cached = this.catalogCache.get(CACHE_KEY);
    if (cached) return cached;

    const course = await this.prisma.course.findFirst({
      where: { id, status: 'ACTIVE' },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            yearsExperience: true,
            rating: true,
            coursesTaught: { select: { id: true } },
          },
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
                isPreview: true,
              },
            },
            quizzes: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                totalQuestions: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const totalVideos = course.sections.reduce(
      (sum, s) => sum + s.videos.length,
      0,
    );
    const totalQuizzes = course.sections.reduce(
      (sum, s) => sum + s.quizzes.length,
      0,
    );

    const result = {
      id: course.id,
      slug: slugify(course.title),
      title: course.title,
      description: course.description ?? '',
      thumbnailUrl: normalizeThumbnail(course.thumbnailUrl),
      price: course.price.toNumber(),
      originalPrice: course.originalPrice?.toNumber() ?? null,
      offPct: discountInfo(course.price.toNumber(), course.originalPrice?.toNumber() ?? null).offPct,
      hasDiscount: discountInfo(course.price.toNumber(), course.originalPrice?.toNumber() ?? null).hasDiscount,
      whatYoullLearn: course.whatYoullLearn,
      techStack: course.techStack,
      careerTitle: course.careerTitle,
      careerBody: course.careerBody,
      category: course.category ?? course.techStack[0] ?? 'General',
      hours:
        Math.round(
          course.sections.reduce(
            (sum, s) =>
              sum + s.videos.reduce((vSum, v) => vSum + v.durationSeconds, 0),
            0,
          ) / 3600,
        ) || 1,
      level: SKILL_LEVEL_LABELS[course.skillLevel ?? 'INTERMEDIATE'],
      rating: course.trainer?.rating ?? 4.7,
      students: course._count.enrollments,
      mentorInitials: (course.trainer?.name ?? 'TM')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      mentorName: course.trainer?.name ?? 'Team',
      mentorAvatar: course.trainer?.avatarUrl ?? null,
      mentorBio: course.trainer?.bio ?? null,
      mentorYearsExp: course.trainer?.yearsExperience ?? null,
      mentorRating: course.trainer?.rating ?? null,
      mentorCoursesTaught: course.trainer?.coursesTaught.length ?? null,
      totalLessons: totalVideos + totalQuizzes,
      totalVideos,
      totalQuizzes,
      sections: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        videos: s.videos.map((v) => ({
          id: v.id,
          title: v.title,
          durationSeconds: v.durationSeconds,
          order: v.order,
          isPreview: v.isPreview,
        })),
        quizzes: s.quizzes.map((q) => ({
          id: null,
          title: q.title,
          order: q.order,
          totalQuestions: q.totalQuestions,
        })),
      })),
    };
    this.catalogCache.set(CACHE_KEY, result);
    return result;
  }

  async relatedCourses(id: string) {
    const CACHE_KEY = `related:${id}`;
    const cached = this.catalogCache.get(CACHE_KEY);
    if (cached) return cached;

    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, category: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const SELECT = {
      id: true,
      title: true,
      thumbnailUrl: true,
      category: true,
      skillLevel: true,
      price: true,
      originalPrice: true,
      trainer: { select: { rating: true } },
      _count: { select: { enrollments: true } },
    } as const;
    const NEEDED = 3;

    const sameCategory = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: id },
        ...(course.category ? { category: course.category } : {}),
      },
      select: SELECT,
      take: NEEDED,
    });

    let rows = sameCategory;
    if (rows.length < NEEDED) {
      const others = await this.prisma.course.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: id, notIn: rows.map((r) => r.id) },
        },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        take: NEEDED - rows.length,
      });
      rows = [...rows, ...others];
    }

    const videoStats = await this.getVideoStats(rows.map((r) => r.id));

    const result = rows.map((r) => {
      const stats = videoStats.get(r.id) ?? { totalSeconds: 0, videoCount: 0 };
      return {
        id: r.id,
        slug: slugify(r.title),
        category: r.category ?? 'General',
        title: r.title,
        img: normalizeThumbnail(r.thumbnailUrl, '/images/logo.png'),
        hours: Math.round(stats.totalSeconds / 3600) || 20,
        level: SKILL_LEVEL_LABELS[r.skillLevel ?? 'INTERMEDIATE'],
        rating: r.trainer?.rating ?? 4.7,
        students: `${((r._count.enrollments / 1000) * 10).toFixed(1).replace('.0', '')}k`,
        mentorName: 'Team',
        ...discountInfo(r.price.toNumber(), r.originalPrice?.toNumber() ?? null),
      };
    });

    this.catalogCache.set(CACHE_KEY, result);
    return result;
  }

  async getCourseOverview(courseId: string) {
    return this.catalogCache.getOrRefresh(`overview:${courseId}`, () =>
      this.computeCourseOverview(courseId),
    );
  }

  private async computeCourseOverview(courseId: string) {
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
            _count: { select: { coursesTaught: true } },
          },
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
                isPreview: true, // only preview videos are playable without enrollment
              },
            },
            quizzes: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                totalQuestions: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    // Compute totals
    const totalVideos = course.sections.reduce(
      (sum, s) => sum + s.videos.length,
      0,
    );
    const totalQuizzes = course.sections.reduce(
      (sum, s) => sum + s.quizzes.length,
      0,
    );
    const totalDurationSecs = course.sections.reduce(
      (sum, s) => sum + s.videos.reduce((vs, v) => vs + v.durationSeconds, 0),
      0,
    );
    const totalHours = Math.round((totalDurationSecs / 3600) * 10) / 10;

    // Build curriculum — merge videos and quizzes per section by order
    // Videos that are NOT isPreview should have their id omitted —
    // visitors shouldn't be able to guess video IDs for OTP requests
    const curriculum = course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      totalItems: section.videos.length + section.quizzes.length,
      items: [
        ...section.videos.map((v) => ({
          type: 'video' as const,
          id: v.isPreview ? v.id : null,
          title: v.title,
          durationSeconds: v.durationSeconds,
          order: v.order,
          isPreview: v.isPreview,
          isLocked: !v.isPreview,
        })),
        ...section.quizzes.map((q) => ({
          type: 'quiz' as const,
          id: null, // quiz IDs never exposed to unenrolled users
          title: q.title,
          totalQuestions: q.totalQuestions,
          order: q.order,
          isPreview: false,
          isLocked: true,
        })),
      ].sort((a, b) => a.order - b.order),
    }));

    return {
      id: course.id,
      title: course.title,
      category: course.category,
      skillLevel: course.skillLevel,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      price: course.price.toNumber(),
      originalPrice: course.originalPrice?.toNumber() ?? null,
      offPct: discountInfo(course.price.toNumber(), course.originalPrice?.toNumber() ?? null).offPct,
      hasDiscount: discountInfo(course.price.toNumber(), course.originalPrice?.toNumber() ?? null).hasDiscount,
      whatYoullLearn: course.whatYoullLearn,
      techStack: course.techStack,
      careerTitle: course.careerTitle,
      careerBody: course.careerBody,
      totalVideos,
      totalQuizzes,
      totalHours,
      totalSections: course.sections.length,
      enrollmentCount: course._count.enrollments,
      instructor: course.trainer
        ? {
            id: course.trainer.id,
            name: course.trainer.name,
            avatarUrl: course.trainer.avatarUrl,
            bio: course.trainer.bio,
            yearsExperience: course.trainer.yearsExperience,
            rating: course.trainer.rating,
            coursesTaughtCount: course.trainer._count.coursesTaught,
          }
        : null,
      curriculum,
    };
  }

  async getPublicVideoOtp(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        vdoCipherId: true,
        videoStatus: true,
        isPreview: true,
        order: true,
        section: {
          select: {
            id: true,
            courseId: true,
            course: { select: { status: true } },
          },
        },
      },
    });

    if (!video) throw new NotFoundException('Video not available for preview');
    if (video.videoStatus !== 'READY')
      throw new BadRequestException('Video not ready');
    if (!video.section?.course || video.section.course.status !== 'ACTIVE')
      throw new NotFoundException('Video not available');
    if (!video.isPreview)
      throw new NotFoundException('Video not available for preview');

    const firstSection = await this.prisma.section.findFirst({
      where: { courseId: video.section.courseId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (video.section.id !== firstSection?.id)
      throw new NotFoundException('Video not available for preview');

    const firstVideo = await this.prisma.video.findFirst({
      where: { sectionId: video.section.id },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    if (video.id !== firstVideo?.id)
      throw new NotFoundException('Video not available for preview');

    return this.vdoCipherService.getPlaybackOtp(video.vdoCipherId, {
      name: 'Preview User',
      email: 'preview@futurestack.in',
    });
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
        ],
      }),
    };

    const courses = await this.prisma.course.findMany({
      where,
      take: limit,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        code: true,
        category: true,
        skillLevel: true,
        description: true,
        thumbnailUrl: true,
        price: true,
        originalPrice: true,
        isFeatured: true,
        techStack: true,
        _count: { select: { enrollments: true } },
        trainer: { select: { id: true, name: true, avatarUrl: true } },
        sections: {
          select: {
            _count: { select: { videos: true } },
          },
        },
      },
    });

    return {
      query: query.q ?? null,
      total: courses.length,
      results: courses.map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        category: c.category,
        skillLevel: c.skillLevel,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        price: c.price.toNumber(),
        originalPrice: c.originalPrice?.toNumber() ?? null,
        ...discountInfo(c.price.toNumber(), c.originalPrice?.toNumber() ?? null),
        isFeatured: c.isFeatured,
        techStack: c.techStack,
        enrollmentCount: c._count.enrollments,
        totalVideos: c.sections.reduce((sum, s) => sum + s._count.videos, 0),
        trainer: c.trainer ?? null,
      })),
    };
  }

  // ==================== FEATURE + REORDER ====================

  async featureCourse(id: string, dto: FeatureDto) {
    this.invalidateCatalog();
    await this.findCourseOrFail(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async featureTrack(id: string, dto: FeatureDto) {
    this.invalidateCatalog();
    await this.findTrackOrFail(id);
    return this.prisma.track.update({ where: { id }, data: dto });
  }

  async reorderFeaturedCourses(dto: ReorderItemsDto) {
    this.invalidateCatalog();
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
    this.invalidateCatalog();
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
    this.invalidateCatalog();
    return this.prisma.track.create({ data: dto });
  }

  async listTracks() {
    return this.prisma.track.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTrack(id: string, dto: UpdateTrackDto) {
    this.invalidateCatalog();
    await this.findTrackOrFail(id);
    return this.prisma.track.update({ where: { id }, data: dto });
  }

  async deleteTrack(id: string) {
    this.invalidateCatalog();
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

  private async generateCourseCode(title: string): Promise<string> {
    const prefix =
      title
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 3) || 'CRS';
    const last = await this.prisma.course.findFirst({
      where: { code: { startsWith: `CRS-${prefix}-` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const next = last?.code
      ? parseInt(last.code.split('-').pop() ?? '0', 10) + 1
      : 1;
    return `CRS-${prefix}-${String(next).padStart(3, '0')}`;
  }

  async createCourse(dto: CreateCourseDto) {
    this.invalidateCatalog();
    if (dto.trainerId) await this.validateApprovedTrainer(dto.trainerId);
    const existing = await this.prisma.course.findUnique({
      where: { title: dto.title },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        `A course with the title "${dto.title}" already exists`,
      );
    const code = dto.code ?? (await this.generateCourseCode(dto.title));
    const { careerPath, ...data } = dto;
    const course = await this.prisma.course.create({ data: { ...data, code } });
    if (careerPath?.trim()) {
      await this.setCourseCareerPath(course.id, careerPath);
    }
    return course;
  }

  async listCourses() {
    const courses = await this.prisma.course.findMany({
      include: {
        trainer: {
          select: { id: true, name: true, email: true, rating: true },
        },
        tracks: {
          include: { track: { select: { id: true, title: true } } },
        },
        _count: { select: { enrollments: true, sections: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const [videoStats, quizCounts] = await Promise.all([
      this.getVideoStats(courses.map((c) => c.id)),
      this.getQuizCounts(courses.map((c) => c.id)),
    ]);

    return courses.map((course) => {
      const stats = videoStats.get(course.id) ?? {
        totalSeconds: 0,
        videoCount: 0,
      };
      const totalHours = Math.round(stats.totalSeconds / 3600);
      return {
        ...course,
        totalLessons: stats.videoCount + (quizCounts.get(course.id) ?? 0),
        totalHours,
        durationWeeks:
          totalHours > 0 ? Math.max(1, Math.round(totalHours / 10)) : 0,
      };
    });
  }

  private async getQuizCounts(
    courseIds: string[],
  ): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map();
    const rows: { courseId: string; quizCount: number | null }[] =
      await this.prisma.$queryRawUnsafe(
        `SELECT s."courseId", COUNT(q.id) as "quizCount"
         FROM "Section" s LEFT JOIN "Quiz" q ON q."sectionId" = s."id"
         WHERE s."courseId" = ANY($1)
         GROUP BY s."courseId"`,
        courseIds,
      );
    return new Map(rows.map((r) => [r.courseId, Number(r.quizCount ?? 0)]));
  }

  async findAllCards(opts: {
    page: number;
    perPage: number;
    search?: string;
    sort?: string;
    filters?: Record<string, string[]>;
    fields?: string;
  }) {
    // `fields=lean` powers the nav mega-menu: it only needs slug/title/category/
    // duration/level/techStack/hours — NOT the heavy full-object fields like
    // description, whatYoullLearn, careerBody, tracks, price, thumbnail. This
    // slashes the payload (and the TTLCache footprint) for the every-page nav.
    const lean = opts.fields === 'lean';

    // Only cache the plain catalog views (no search / filters) — those are the
    // hot requests (nav mega menu, courses listing, related courses) and their
    // result barely changes. Search + filter responses are uncached.
    const isFullCatalog =
      !opts.search?.trim() && (!opts.filters || Object.keys(opts.filters).length === 0);
    const CACHE_KEY = `cards:${opts.page}:${opts.perPage}:${opts.sort ?? 'default'}:${lean ? 'lean' : 'full'}`;
    if (isFullCatalog) {
      const cached = this.catalogCache.get(CACHE_KEY);
      if (cached) return cached;
    }

    const where: any = { status: 'ACTIVE' };

    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { techStack: { has: q } },
        { careerTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    // `category` and `duration` are computed fields, so all filtering happens
    // in memory AFTER building the cards but BEFORE pagination — this keeps
    // `total` and page numbers correct. The catalog is small enough for this.
    const activeFilters: { field: string; values: string[] }[] = [];
    if (opts.filters) {
      for (const [field, values] of Object.entries(opts.filters)) {
        if (values.length > 0) activeFilters.push({ field, values });
      }
    }

    let orderBy: any = { createdAt: 'desc' };
    if (opts.sort === 'Highest Rated')
      orderBy = { trainer: { rating: 'desc' } };
    else if (opts.sort === 'Lowest Rated')
      orderBy = { trainer: { rating: 'asc' } };
    else if (opts.sort === 'Most Popular')
      orderBy = { enrollments: { _count: 'desc' } };

    const leanSelect: Record<string, any> & {
      _count?: boolean;
      trainer?: boolean;
      tracks?: boolean;
    } = {
      id: true,
      title: true,
      code: true,
      description: true,
      category: true,
      techStack: true,
      skillLevel: true,
      createdAt: true,
      updatedAt: true,
    };
    if (!lean) {
      (leanSelect as any).thumbnailUrl = true;
      (leanSelect as any).price = true;
      (leanSelect as any).originalPrice = true;
      (leanSelect as any).whatYoullLearn = true;
      (leanSelect as any).careerTitle = true;
      (leanSelect as any).careerBody = true;
      (leanSelect as any).trainer = { select: { name: true, rating: true } };
      (leanSelect as any).tracks = {
        select: { track: { select: { id: true, title: true } } },
      };
      (leanSelect as any)._count = { select: { enrollments: true } };
    }
    const courses = (await this.prisma.course.findMany({
      where,
      select: leanSelect,
      orderBy,
    })) as any[];

    const videoStats = await this.getVideoStats(courses.map((c) => c.id));

    // Build computed card data
    const enrollmentCounts = courses
      .map((c) => c._count?.enrollments ?? 0)
      .sort((a, b) => b - a);
    const trendingThreshold =
      enrollmentCounts[Math.floor(enrollmentCounts.length * 0.2)] ?? 0;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    let data: any[] = courses.map((course) => {
      const stats = videoStats.get(course.id) ?? {
        totalSeconds: 0,
        videoCount: 0,
      };
      const totalHours = Math.round(stats.totalSeconds / 3600);
      const durationLabel =
        totalHours > 50
          ? '50+ hrs'
          : totalHours > 20
            ? '20 – 50 hrs'
            : '5 – 20 hrs';

      if (lean) {
        const category = course.category ?? course.techStack[0] ?? 'General';
        const level = SKILL_LEVEL_LABELS[course.skillLevel ?? 'INTERMEDIATE'];
        return {
          id: course.id,
          slug: slugify(course.title),
          category,
          title: course.title,
          description: course.description ?? '',
          hours: totalHours || 20,
          level,
          techStack: course.techStack,
          duration: durationLabel,
        };
      }
      const isTrending =
        (course._count?.enrollments ?? 0) > 0 &&
        (course._count?.enrollments ?? 0) >= trendingThreshold;
      const isNew = course.createdAt >= fourteenDaysAgo;
      const badge = null;
      const badgeClass = '';
      const category = course.category ?? course.techStack[0] ?? 'General';
      const level = SKILL_LEVEL_LABELS[course.skillLevel ?? 'INTERMEDIATE'];

      return {
        id: course.id,
        slug: slugify(course.title),
        category,
        trackNames: course.tracks.map((tc) => tc.track.title),
        title: course.title,
        code: course.code,
        description: course.description ?? '',
        hours: totalHours || 20,
        students: `${((course._count.enrollments / 1000) * 10).toFixed(1).replace('.0', '')}k`,
        level,
        rating: course.trainer?.rating ?? 4.7,
        reviews: `${course._count.enrollments}`,
        badge,
        badgeClass,
        mentor: (course.trainer?.name ?? 'TM')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        mentorName: course.trainer?.name ?? 'Team',
        mentorColor: 'from-blue-500 to-blue-600',
        img: normalizeThumbnail(course.thumbnailUrl, '/images/logo.png'),
        mode: 'Self-Paced',
        goal: 'Upskill',
        tech: category,
        duration: durationLabel,
        price: course.price?.toNumber?.() ?? course.price,
        ...discountInfo(
          course.price?.toNumber?.() ?? course.price,
          course.originalPrice?.toNumber?.() ?? course.originalPrice ?? null,
        ),
        techStack: course.techStack,
        whatYoullLearn: course.whatYoullLearn,
        careerTitle: course.careerTitle,
        careerBody: course.careerBody,
        updatedAt: course.updatedAt,
      };
    });

    // Facets are computed from the search-matched set (before filters), so the
    // sidebar always shows every available option with its true catalog count.
    const countBy = (getValues: (c: (typeof data)[number]) => string[]) => {
      const counts = new Map<string, number>();
      for (const c of data) {
        for (const v of getValues(c)) {
          if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, count }));
    };
    // Fixed option lists shown even when no course matches them (count 0).
    // level/mode/goal are not DB fields yet — every card carries the defaults,
    // so most of these stay at 0 until real columns exist.
    const fixedOptions = (
      items: string[],
      getValue: (c: (typeof data)[number]) => string,
    ) =>
      items.map((value) => ({
        value,
        count: data.filter((c) => getValue(c) === value).length,
      }));

    const DURATION_ORDER = ['5 – 20 hrs', '20 – 50 hrs', '50+ hrs'];
    // Career Track facet is computed from the DB (all tracks) so it is always
    // available in the sidebar — even at count 0 or when a search yields nothing.
    const trackRows = lean
      ? []
      : await this.prisma.track.findMany({
          select: {
            title: true,
            courses: {
              where: { course: { status: 'ACTIVE' } },
              select: { id: true },
            },
          },
        });
    const facets = lean
      ? []
      : [
          {
            key: 'track',
            title: 'Career Track',
            options: trackRows
              .map((t) => ({ value: t.title, count: t.courses.length }))
              .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
          },
      {
        key: 'level',
        title: 'Skill Level',
        options: fixedOptions(
          Object.values(SKILL_LEVEL_LABELS),
          (c) => c.level,
        ),
      },
      {
        key: 'category',
        title: 'Category',
        options: countBy((c) => [c.category]),
      },
      {
        key: 'duration',
        title: 'Duration',
        options: fixedOptions(DURATION_ORDER, (c) => c.duration),
      },
      {
        key: 'mode',
        title: 'Learning Mode',
        options: fixedOptions(
          ['Self-Paced', 'Live Cohort', 'Mentor-Led', 'Bootcamp'],
          (c) => c.mode,
        ),
      },
      {
        key: 'goal',
        title: 'Career Goal',
        options: fixedOptions(
          ['Get Hired', 'Upskill', 'Freelance', 'Start-up Ready'],
          (c) => c.goal,
        ),
      },
      {
        key: 'tech',
        title: 'Technology Stack',
        options: countBy((c) => c.techStack),
      },
    ];

    // Apply filters (tech matches any chip in the stack; track matches any linked
    // track name; others match the computed field)
    for (const { field, values } of activeFilters) {
      if (field === 'tech') {
        data = data.filter((c) => c.techStack.some((t) => values.includes(t)));
      } else if (field === 'track') {
        data = data.filter((c) =>
          c.trackNames?.some((n: string) => values.includes(n)),
        );
      } else if (
        ['duration', 'category', 'level', 'mode', 'goal'].includes(field)
      ) {
        data = data.filter((c) => values.includes(String((c as any)[field])));
      }
    }

    if (opts.sort === 'Duration: Shortest') {
      data.sort((a, b) => a.hours - b.hours);
    }

    const total = data.length;
    const start = (opts.page - 1) * opts.perPage;
    data = data.slice(start, start + opts.perPage);

    const result = { data, total, page: opts.page, perPage: opts.perPage, facets };
    if (isFullCatalog) this.catalogCache.set(CACHE_KEY, result);
    return result;
  }

  async getCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        trainer: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
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
    this.invalidateCatalog();
    await this.findCourseOrFail(id);
    if (dto.trainerId !== undefined)
      await this.validateApprovedTrainer(dto.trainerId);
    if (dto.title) {
      const existing = await this.prisma.course.findUnique({
        where: { title: dto.title },
        select: { id: true },
      });
      if (existing && existing.id !== id)
        throw new ConflictException(
          `A course with the title "${dto.title}" already exists`,
        );
    }
    const { price, originalPrice, priceUsd, originalPriceUsd, careerPath, ...rest } =
      dto;
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...rest,
        ...(price !== undefined ? { price } : {}),
        ...(originalPrice !== undefined ? { originalPrice } : {}),
        ...(priceUsd !== undefined ? { priceUsd } : {}),
        ...(originalPriceUsd !== undefined ? { originalPriceUsd } : {}),
      },
    });
    if (careerPath !== undefined) {
      await this.setCourseCareerPath(id, careerPath);
    }
    return course;
  }

  async deleteCourse(id: string) {
    this.invalidateCatalog();
    const course = await this.findCourseOrFail(id);
    const activeCount = await this.prisma.enrollment.count({
      where: { courseId: id, status: 'active' },
    });
    if (activeCount > 0) {
      throw new ConflictException(
        `Cannot delete this course — it has ${activeCount} active enrollment(s).`,
      );
    }
    await this.prisma.course.delete({ where: { id } });
    if (course.thumbnailUrl) {
      try { await this.s3Service.deleteByUrl(course.thumbnailUrl); } catch {}
    }
    return { message: 'Course deleted' };
  }

  async linkCourseToTrack(courseId: string, trackId: string) {
    this.invalidateCatalog();
    await this.findCourseOrFail(courseId);
    await this.findTrackOrFail(trackId);
    try {
      return await this.prisma.trackCourse.create({
        data: { courseId, trackId },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'This course is already linked to that track',
        );
      }
      throw e;
    }
  }

  async unlinkCourseFromTrack(courseId: string, trackId: string) {
    this.invalidateCatalog();
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

  async setCourseCareerPath(courseId: string, title?: string) {
    this.invalidateCatalog();
    await this.findCourseOrFail(courseId);
    await this.prisma.trackCourse.deleteMany({ where: { courseId } });

    const value = title?.trim();
    if (!value) return { message: 'Course career path cleared' };

    let track = await this.prisma.track.findFirst({
      where: { title: { equals: value, mode: 'insensitive' } },
    });
    if (!track) {
      // Give auto-created tracks a unique displayOrder so none get collapsed
      // by featuredTracks()'s displayOrder de-duplication on the /paths page.
      const maxOrder = await this.prisma.track.aggregate({
        _max: { displayOrder: true },
      });
      track = await this.prisma.track.create({
        data: {
          title: value,
          displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        },
      });
    }

    await this.prisma.trackCourse.upsert({
      where: { trackId_courseId: { trackId: track.id, courseId } },
      create: { trackId: track.id, courseId },
      update: {},
    });
    return { track, message: 'Course career path updated' };
  }

  private async findCourseOrFail(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // Rejects if the user is not an APPROVED TRAINER. Called on create and
  // on update whenever trainerId is explicitly included in the request body.
  private async validateApprovedTrainer(trainerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });
    if (!user || user.role !== Role.TRAINER) {
      throw new BadRequestException(`User ${trainerId} is not a trainer`);
    }
    if (user.approvalStatus !== 'APPROVED') {
      throw new BadRequestException(
        `Trainer must be approved before being assigned to a course (current status: ${user.approvalStatus?.toLowerCase() ?? 'unknown'})`,
      );
    }
  }

  // ==================== SECTIONS ====================

  async createSection(courseId: string, dto: CreateSectionDto) {
    this.invalidateCatalog();
    await this.findCourseOrFail(courseId);
    return this.prisma.section.create({ data: { ...dto, courseId } });
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    this.invalidateCatalog();
    await this.findSectionOrFail(id);
    return this.prisma.section.update({ where: { id }, data: dto });
  }

  async deleteSection(id: string) {
    this.invalidateCatalog();
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
    this.invalidateCatalog();
    const section = await this.findSectionOrFail(sectionId);

    // The very first video ever added to a course becomes its "intro video" —
    // playable publicly without enrollment (see getPublicVideoOtp), so a
    // prospective student always has something to preview before buying.
    // There's no separate UI for marking a video as preview (CurriculumBuilder
    // has no such control), so this is the only path that ever sets it — once
    // the course has any video, every later one defaults to locked (false).
    const existingVideoCount = await this.prisma.video.count({
      where: { section: { courseId: section.courseId } },
    });
    const isPreview = existingVideoCount === 0;

    return this.prisma.video.create({ data: { ...dto, sectionId, isPreview } });
  }

  async updateVideo(id: string, dto: UpdateVideoDto) {
    this.invalidateCatalog();
    await this.findVideoOrFail(id);
    return this.prisma.video.update({ where: { id }, data: dto });
  }

  async deleteVideo(id: string) {
    this.invalidateCatalog();
    const video = await this.findVideoOrFail(id);
    await this.vdoCipherService.deleteVideo(video.vdoCipherId);
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
    this.invalidateCatalog();
    await this.findSectionOrFail(sectionId);
    const data: Record<string, unknown> = { ...dto };
    delete data.sectionId; // sectionId comes from the route param here
    if (data.totalQuestions == null) data.totalQuestions = 0;
    return this.prisma.quiz.create({ data: { ...data, sectionId } as any });
  }

  // Standalone quiz — not attached to a course section (formerly SkillTest).
  async createStandaloneQuiz(dto: CreateQuizDto) {
    this.invalidateCatalog();
    const data: Record<string, unknown> = { ...dto };
    delete data.sectionId;
    if (data.totalQuestions == null) data.totalQuestions = 0;
    return this.prisma.quiz.create({ data: { ...data, sectionId: null } as any });
  }

  async listStandaloneQuizzes() {
    const quizzes = await this.prisma.quiz.findMany({
      where: { sectionId: null },
      orderBy: [{ order: 'asc' }],
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return quizzes.map((q) => ({
      ...q,
      questionCount: q._count.questions,
      attemptCount: q._count.attempts,
      _count: undefined,
    }));
  }

  // Fetches any quiz by id (standalone or section-linked) with its questions —
  // used by the admin question editor regardless of where the quiz lives.
  async getStandaloneQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    this.invalidateCatalog();
    await this.findQuizOrFail(id);
    const data: Record<string, unknown> = { ...dto };
    delete data.sectionId;
    return this.prisma.quiz.update({ where: { id }, data });
  }

  async deleteQuiz(id: string) {
    this.invalidateCatalog();
    await this.findQuizOrFail(id);
    await this.prisma.quiz.delete({ where: { id } });
    return { message: 'Quiz deleted' };
  }

  private async findQuizOrFail(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  // ==================== QUIZ QUESTIONS ====================

  async addQuizQuestion(quizId: string, dto: CreateQuizQuestionDto) {
    this.invalidateCatalog();
    await this.findQuizOrFail(quizId);
    const question = await this.prisma.quizQuestion.create({
      data: { ...dto, quizId },
    });
    await this.syncQuizTotalQuestions(quizId);
    return question;
  }

  async updateQuizQuestion(id: string, dto: UpdateQuizQuestionDto) {
    this.invalidateCatalog();
    const question = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return this.prisma.quizQuestion.update({ where: { id }, data: dto });
  }

  async deleteQuizQuestion(id: string) {
    this.invalidateCatalog();
    const question = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    await this.prisma.quizQuestion.delete({ where: { id } });
    await this.syncQuizTotalQuestions(question.quizId);
    return { success: true };
  }

  private async syncQuizTotalQuestions(quizId: string) {
    const count = await this.prisma.quizQuestion.count({ where: { quizId } });
    await this.prisma.quiz.update({ where: { id: quizId }, data: { totalQuestions: count } });
  }

  // ==================== RESOURCES ====================

  async createResource(courseId: string, dto: CreateResourceDto) {
    this.invalidateCatalog();
    await this.findCourseOrFail(courseId);
    return this.prisma.courseResource.create({ data: { ...dto, courseId } });
  }

  async deleteResource(id: string) {
    this.invalidateCatalog();
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
    });
    if (!resource) throw new NotFoundException('Resource not found');
    await this.prisma.courseResource.delete({ where: { id } });
    if (resource.fileUrl) {
      try { await this.s3Service.deleteByUrl(resource.fileUrl); } catch {}
    }
    return { message: 'Resource deleted' };
  }

  // ==================== TRAINER REVENUE ====================

  async trainerRevenue(trainerId: string) {
    const courses = await this.prisma.course.findMany({
      where: { trainerId, status: 'ACTIVE' },
      select: { id: true, title: true, price: true, code: true },
    });

    const courseIds = courses.map((c) => c.id);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId: { in: courseIds }, status: 'active' },
      include: {
        student: { select: { id: true, name: true } },
        course: { select: { title: true, price: true, code: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const list = enrollments.map((e) => {
      const amountPaid = e.amountPaid.toNumber();
      const courseFee = e.course.price.toNumber();
      const paymentMode =
        amountPaid >= courseFee
          ? 'Full'
          : amountPaid > 0
            ? 'EMI'
            : 'Pending';

      return {
        id: e.id,
        student: e.student.name,
        batchCode: e.course.code ?? e.course.title.slice(0, 8).toUpperCase(),
        course: e.course.title,
        courseFee,
        paymentMode,
        enrolledOn: e.enrolledAt.toISOString().slice(0, 10),
      };
    });

    return { enrollments: list };
  }

  async trainerPayouts(trainerId: string) {
    // Payout records not yet modeled in the database.
    // Return empty list until the feature is implemented.
    return [];
  }

  // ==================== HERO SLIDES ====================

  async featuredHeroSlides() {
    return this.catalogCache.getOrRefresh('hero-slides', () =>
      this.computeFeaturedHeroSlides(),
    );
  }

  private async computeFeaturedHeroSlides() {
    const SLOT_COUNT = 3;
    const slides = await this.prisma.heroSlide.findMany({
      where: { isFeatured: true, displayOrder: { lt: SLOT_COUNT } },
      orderBy: { displayOrder: 'asc' },
      take: SLOT_COUNT,
    });
    const seen = new Set<number>();
    return slides.filter((s) => {
      if (seen.has(s.displayOrder)) return false;
      seen.add(s.displayOrder);
      return true;
    });
  }

  async createHeroSlide(dto: CreateHeroSlideDto) {
    this.invalidateHero();
    return this.prisma.heroSlide.create({ data: dto });
  }

  async listHeroSlides() {
    return this.prisma.heroSlide.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async deleteHeroSlide(id: string) {
    this.invalidateHero();
    const slide = await this.prisma.heroSlide.findUnique({ where: { id } });
    await this.prisma.heroSlide.delete({ where: { id } });
    if (slide?.imageUrl) {
      try {
        await this.s3Service.deleteByUrl(slide.imageUrl);
      } catch {
        // File already gone or S3 unreachable — the slide record is deleted regardless.
      }
    }
    return { message: 'Hero slide deleted' };
  }

  async featureHeroSlide(id: string, dto: FeatureDto) {
    this.invalidateHero();
    await this.prisma.heroSlide.findUniqueOrThrow({ where: { id } });
    return this.prisma.heroSlide.update({ where: { id }, data: dto });
  }

  async reorderHeroSlides(dto: ReorderItemsDto) {
    this.invalidateHero();
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.heroSlide.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
    return { message: 'Hero slides reordered' };
  }
}
