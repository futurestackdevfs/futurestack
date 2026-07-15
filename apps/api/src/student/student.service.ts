import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';

export interface NextVideo {
  id: string;
  title: string;
  sectionTitle: string;
}

export interface CourseProgress {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  progressPercent: number;
  completedVideos: number;
  totalVideos: number;
  hoursRemaining: number;
  nextVideo: NextVideo | null;
}

// Shared shape for both video and quiz items in the curriculum list —
// frontend renders them in one merged, ordered list per section.
export interface CurriculumItem {
  type: 'video' | 'quiz';
  id: string;
  title: string;
  order: number;
  durationSeconds?: number;   // videos only
  totalQuestions?: number;    // quizzes only
  passingScore?: number | null; // quizzes only
  score: number | null;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

export interface VideoProgressResult {
  videoId: string;
  uniqueSecsWatched: number;
  lastPositionSec: number;
  isCompleted: boolean;
  completedAt: Date | null;
  justCompleted: boolean; // true only on the update that crosses the completion threshold
}

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async getDashboard(studentId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: 'active' },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                videos: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });

    // Fetch all of this student's video progress once, rather than
    // per-enrollment, to avoid N+1 queries.
    const allProgress = await this.prisma.videoProgress.findMany({
      where: { studentId },
    });
    const progressByVideoId = new Map(allProgress.map((p) => [p.videoId, p]));

    const enrolledCourses: CourseProgress[] = enrollments.map((enrollment) => {
      const course = enrollment.course;

      // Flatten sections → videos, keeping section title for "next video" display.
      // Order matters here — it's how we determine which video is "next"
      // under the strictly-sequential video rule.
      const orderedVideos = course.sections.flatMap((section) =>
        section.videos.map((video) => ({
          id: video.id,
          title: video.title,
          durationSeconds: video.durationSeconds,
          sectionTitle: section.title,
        })),
      );

      const totalVideos = orderedVideos.length;

      let completedVideos = 0;
      let secondsRemaining = 0;
      let nextVideo: NextVideo | null = null;

      for (const video of orderedVideos) {
        const progress = progressByVideoId.get(video.id);
        const isCompleted = progress?.isCompleted ?? false;

        if (isCompleted) {
          completedVideos += 1;
        } else {
          secondsRemaining += video.durationSeconds;
          // First incomplete video in sequence order is "next" —
          // matches the strictly-sequential unlock rule.
          if (!nextVideo) {
            nextVideo = {
              id: video.id,
              title: video.title,
              sectionTitle: video.sectionTitle,
            };
          }
        }
      }

      const progressPercent =
        totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
      const hoursRemaining = Math.round((secondsRemaining / 3600) * 10) / 10;

      return {
        courseId: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        progressPercent,
        completedVideos,
        totalVideos,
        hoursRemaining,
        nextVideo,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      enrolledCourses,
    };
  }

  async getCourseDetail(studentId: string, courseId: string) {
    // Must be actively enrolled to view the full curriculum —
    // prevents students from browsing paid content they haven't bought.
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });

    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        trainer: {
          include: {
            _count: { select: { coursesTaught: true } },
          },
        },
        resources: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: { orderBy: { order: 'asc' } },
            quizzes: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Pull this student's progress/attempts once, up front — avoids
    // N+1 queries while walking sections below.
    const videoIds = course.sections.flatMap((s) => s.videos.map((v) => v.id));
    const quizIds = course.sections.flatMap((s) => s.quizzes.map((q) => q.id));

    const [videoProgressRows, quizAttemptRows] = await Promise.all([
      this.prisma.videoProgress.findMany({
        where: { studentId, videoId: { in: videoIds } },
      }),
      this.prisma.quizAttempt.findMany({
        where: { studentId, quizId: { in: quizIds } },
      }),
    ]);

    const videoProgressById = new Map(videoProgressRows.map((p) => [p.videoId, p]));
    const quizAttemptById = new Map(quizAttemptRows.map((a) => [a.quizId, a]));

    // Build one flat, ordered list of items per section (video + quiz
    // merged by `order`), then walk the WHOLE course in order to apply
    // strictly-sequential locking — the first incomplete item anywhere
    // in the course is "current", everything after it is locked.
    let foundCurrent = false;
    let totalItems = 0;
    let completedItems = 0;

    const sections = course.sections.map((section) => {
      const items: CurriculumItem[] = [
        ...section.videos.map((v) => {
          const progress = videoProgressById.get(v.id);
          return {
            type: 'video' as const,
            id: v.id,
            title: v.title,
            order: v.order,
            durationSeconds: v.durationSeconds,
            score: progress?.score ?? null,
            isCompleted: progress?.isCompleted ?? false,
            isCurrent: false,
            isLocked: false,
          };
        }),
        ...section.quizzes.map((q) => {
          const attempt = quizAttemptById.get(q.id);
          return {
            type: 'quiz' as const,
            id: q.id,
            title: q.title,
            order: q.order,
            totalQuestions: q.totalQuestions,
            passingScore: q.passingScore,
            score: attempt?.score ?? null,
            isCompleted: attempt?.isCompleted ?? false,
            isCurrent: false,
            isLocked: false,
          };
        }),
      ].sort((a, b) => a.order - b.order);

      for (const item of items) {
        totalItems += 1;
        if (item.isCompleted) {
          completedItems += 1;
        } else if (!foundCurrent) {
          item.isCurrent = true;
          foundCurrent = true;
        } else {
          item.isLocked = true;
        }
      }

      const sectionCompletedCount = items.filter((i) => i.isCompleted).length;

      return {
        id: section.id,
        title: section.title,
        order: section.order,
        totalItems: items.length,
        completedItems: sectionCompletedCount,
        items,
      };
    });

    const progressPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        whatYoullLearn: course.whatYoullLearn,
        techStack: course.techStack,
        careerTitle: course.careerTitle,
        careerBody: course.careerBody,
      },
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
      progress: {
        completedItems,
        totalItems,
        progressPercent,
      },
      resources: course.resources.map((r) => ({
        id: r.id,
        title: r.title,
        fileType: r.fileType,
        fileUrl: r.fileUrl,
        fileSizeLabel: r.fileSizeLabel,
      })),
      sections,
    };
  }

  /**
   * Called repeatedly by the video player (e.g. every 5-10s, and on
   * pause/unmount) with the student's current playback position.
   *
   * uniqueSecsWatched tracks the FURTHEST position ever reached, not
   * cumulative playback time — this is a standard, simple proxy for
   * "unique seconds watched" that resists trivial gaming (replaying the
   * same 10 seconds doesn't inflate the count) without the complexity
   * of true interval tracking.
   */
  async updateVideoProgress(
    studentId: string,
    videoId: string,
    positionSec: number,
  ): Promise<VideoProgressResult> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { section: { include: { course: true } } },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const courseId = video.section.courseId;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });

    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Clamp defensively — a stray client-side bug sending a negative
    // number or something past the video's actual length shouldn't
    // corrupt stored progress.
    const clampedPosition = Math.max(0, Math.min(positionSec, video.durationSeconds));

    const existing = await this.prisma.videoProgress.findUnique({
      where: { studentId_videoId: { studentId, videoId } },
    });

    const newUniqueSecsWatched = Math.max(existing?.uniqueSecsWatched ?? 0, clampedPosition);
    const wasCompleted = existing?.isCompleted ?? false;
    const isNowCompleted = newUniqueSecsWatched >= video.durationSeconds;
    const justCompleted = isNowCompleted && !wasCompleted;

    const updated = await this.prisma.videoProgress.upsert({
      where: { studentId_videoId: { studentId, videoId } },
      create: {
        studentId,
        videoId,
        uniqueSecsWatched: newUniqueSecsWatched,
        lastPositionSec: clampedPosition,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : null,
      },
      update: {
        uniqueSecsWatched: newUniqueSecsWatched,
        lastPositionSec: clampedPosition,
        isCompleted: isNowCompleted,
        // Only set completedAt the first time it crosses the threshold —
        // don't keep bumping it on every subsequent heartbeat call.
        ...(justCompleted ? { completedAt: new Date() } : {}),
      },
    });

    if (isNowCompleted || wasCompleted) {
      await this.certificatesService.checkAndIssueCertificate(studentId, courseId);
    }

    return {
      videoId: updated.videoId,
      uniqueSecsWatched: updated.uniqueSecsWatched,
      lastPositionSec: updated.lastPositionSec,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt,
      justCompleted,
    };
  }
}