import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { S3Service } from '../upload/s3.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
  durationSeconds?: number; // videos only
  totalQuestions?: number; // quizzes only
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
    private readonly vdoCipherService: VdoCipherService,
    private readonly s3Service: S3Service,
  ) {}

  async getDashboard(
    studentId: string,
    userInfo: { id: string; email: string; name: string; role: string },
  ) {
    // Run queries in parallel — progress doesn't depend on enrollments
    const [enrollments, allProgress, allQuizAttempts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId, status: 'active' },
        select: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              sections: {
                orderBy: { order: 'asc' },
                select: {
                  title: true,
                  videos: {
                    orderBy: { order: 'asc' },
                    select: {
                      id: true,
                      title: true,
                      durationSeconds: true,
                      order: true,
                    },
                  },
                  quizzes: {
                    orderBy: { order: 'asc' },
                    select: { id: true, title: true, order: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.videoProgress.findMany({
        where: { studentId },
        select: { videoId: true, isCompleted: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { studentId },
        select: { quizId: true, isCompleted: true },
      }),
    ]);

    const progressByVideoId = new Map(allProgress.map((p) => [p.videoId, p]));
    const quizAttemptById = new Map(allQuizAttempts.map((a) => [a.quizId, a]));

    const enrolledCourses: CourseProgress[] = enrollments.map((enrollment) => {
      const course = enrollment.course;

      // Flatten sections → items (videos + quizzes), keeping section title for "next" display.
      // Order matters here — it's how we determine which item is "next"
      // under the strictly-sequential rule.
      const orderedItems = course.sections.flatMap((section) => {
        const items = [
          ...section.videos.map((v) => ({
            ...v,
            type: 'video' as const,
            sectionTitle: section.title,
          })),
          ...section.quizzes.map((q) => ({
            ...q,
            type: 'quiz' as const,
            durationSeconds: 0,
            sectionTitle: section.title,
          })),
        ];
        return items.sort((a, b) => a.order - b.order);
      });

      // We continue to return "totalVideos" and "completedVideos" in the payload
      // so we don't break frontend types, but they actually represent "totalItems".
      const totalVideos = orderedItems.length;

      let completedVideos = 0;
      let secondsRemaining = 0;
      let nextVideo: NextVideo | null = null;

      for (const item of orderedItems) {
        let isCompleted = false;

        if (item.type === 'video') {
          isCompleted = progressByVideoId.get(item.id)?.isCompleted ?? false;
          if (!isCompleted) secondsRemaining += item.durationSeconds;
        } else {
          isCompleted = quizAttemptById.get(item.id)?.isCompleted ?? false;
        }

        if (isCompleted) {
          completedVideos += 1;
        } else if (!nextVideo) {
          // First incomplete item in sequence order is "next"
          nextVideo = {
            id: item.id,
            title: item.title,
            sectionTitle: item.sectionTitle,
          };
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
      user: userInfo,
      enrolledCourses,
      resumeCourses: enrolledCourses.filter((c) => c.progressPercent < 100),
    };
  }

  async getCourseDetail(studentId: string, courseId: string) {
    // Fetch enrollment check and full course data in parallel —
    // both are independent reads, no need to wait for enrollment before fetching course.
    const [enrollment, course] = await Promise.all([
      this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
      }),
      this.prisma.course.findUnique({
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
      }),
    ]);

    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('You are not enrolled in this course');
    }

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

    const videoProgressById = new Map(
      videoProgressRows.map((p) => [p.videoId, p]),
    );
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
    const clampedPosition = Math.max(
      0,
      Math.min(positionSec, video.durationSeconds),
    );

    const existing = await this.prisma.videoProgress.findUnique({
      where: { studentId_videoId: { studentId, videoId } },
    });

    const newUniqueSecsWatched = Math.max(
      existing?.uniqueSecsWatched ?? 0,
      clampedPosition,
    );
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
      await this.certificatesService.checkAndIssueCertificate(
        studentId,
        courseId,
      );
    }

    return {
      videoId: updated.videoId ?? updated.projectCurriculumVideoId ?? '',
      uniqueSecsWatched: updated.uniqueSecsWatched,
      lastPositionSec: updated.lastPositionSec,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt,
      justCompleted,
    };
  }

  async submitQuiz(studentId: string, quizId: string, score: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { section: { include: { course: true } } },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: quiz.section.courseId },
      },
    });

    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const attempt = await this.prisma.quizAttempt.upsert({
      where: { studentId_quizId: { studentId, quizId } },
      create: {
        studentId,
        quizId,
        score,
        isCompleted: true,
        completedAt: new Date(),
      },
      update: {
        score,
        completedAt: new Date(),
      },
    });

    await this.certificatesService.checkAndIssueCertificate(
      studentId,
      quiz.section.courseId,
    );

    return {
      quizId: attempt.quizId,
      score: attempt.score,
      isCompleted: attempt.isCompleted,
      completedAt: attempt.completedAt,
      passed: quiz.passingScore !== null ? score >= quiz.passingScore : null,
      passingScore: quiz.passingScore,
    };
  }

  async getVideoOtp(studentId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { section: { include: { course: true } } },
    });

    if (!video) throw new NotFoundException('Video not found');

    // Must be actively enrolled
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId: video.section.courseId },
      },
    });
    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Video must be ready — not still processing
    if (video.videoStatus !== 'READY') {
      throw new BadRequestException(
        'This video is not yet available for playback',
      );
    }

    // Fetch saved progress position for resume
    const progress = await this.prisma.videoProgress.findUnique({
      where: { studentId_videoId: { studentId, videoId } },
      select: { lastPositionSec: true },
    });

    // Fetch student info for watermark
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true },
    });

    const { otp, playbackInfo } = await this.vdoCipherService.getPlaybackOtp(
      video.vdoCipherId,
      { name: student!.name, email: student!.email },
    );

    return {
      otp,
      playbackInfo,
      videoId: video.id,
      title: video.title,
      durationSeconds: video.durationSeconds,
      initialPosition: progress?.lastPositionSec ?? 0,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // PROJECT VIDEO PROGRESS
  // ─────────────────────────────────────────────────────────────

  async getStudentProjects(studentId: string) {
    const orders = await this.prisma.projectOrder.findMany({
      where: { studentId },
      include: {
        project: {
          include: {
            trainer: {
              select: { name: true, careerPath: true },
            },
            curriculum: {
              include: {
                videos: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get progress for all project videos
    const allVideoIds = orders.flatMap((o) =>
      o.project.curriculum.flatMap((c) => c.videos.map((v) => v.id)),
    );

    const progressRecords = await this.prisma.videoProgress.findMany({
      where: {
        studentId,
        projectCurriculumVideoId: { in: allVideoIds },
      },
    });

    const progressMap = new Map(
      progressRecords.map((p) => [p.projectCurriculumVideoId, p]),
    );

    return orders.map((order) => {
      const project = order.project;
      const allVideos = project.curriculum.flatMap((c) => c.videos);
      const completedVideos = allVideos.filter(
        (v) => progressMap.get(v.id)?.isCompleted,
      ).length;
      const totalVideos = allVideos.length;
      const progressPercent =
        totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        image: project.image,
        shortDesc: project.shortDesc,
        tech: project.stack,
        level: project.level,
        badge: project.badge,
        duration: project.duration,
        trainer: project.trainer?.name || 'TBA',
        trainerRole: project.trainer?.careerPath || '',
        progressPercent,
        completedVideos,
        totalVideos,
        status: order.status,
        pricePaid: order.pricePaid,
        purchasedAt: order.createdAt,
      };
    });
  }

  async updateProjectVideoProgress(
    studentId: string,
    projectVideoId: string,
    positionSec: number,
  ) {
    const projectVideo = await this.prisma.projectCurriculumVideo.findUnique({
      where: { id: projectVideoId },
      include: { curriculum: { include: { project: true } } },
    });

    if (!projectVideo) {
      throw new NotFoundException('Project video not found');
    }

    const clampedPosition = Math.max(
      0,
      Math.min(positionSec, projectVideo.durationSeconds),
    );

    const existing = await this.prisma.videoProgress.findUnique({
      where: { studentId_projectCurriculumVideoId: { studentId, projectCurriculumVideoId: projectVideoId } },
    });

    const newUniqueSecsWatched = Math.max(
      existing?.uniqueSecsWatched ?? 0,
      clampedPosition,
    );
    const wasCompleted = existing?.isCompleted ?? false;
    const isNowCompleted = newUniqueSecsWatched >= projectVideo.durationSeconds;
    const justCompleted = isNowCompleted && !wasCompleted;

    const updated = await this.prisma.videoProgress.upsert({
      where: { studentId_projectCurriculumVideoId: { studentId, projectCurriculumVideoId: projectVideoId } },
      create: {
        studentId,
        projectCurriculumVideoId: projectVideoId,
        uniqueSecsWatched: newUniqueSecsWatched,
        lastPositionSec: clampedPosition,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : null,
      },
      update: {
        uniqueSecsWatched: newUniqueSecsWatched,
        lastPositionSec: clampedPosition,
        isCompleted: isNowCompleted,
        ...(justCompleted ? { completedAt: new Date() } : {}),
      },
    });

    return {
      videoId: updated.projectCurriculumVideoId,
      uniqueSecsWatched: updated.uniqueSecsWatched,
      lastPositionSec: updated.lastPositionSec,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt,
      justCompleted,
    };
  }

  async getProjectVideoOtp(studentId: string, projectVideoId: string) {
    const projectVideo = await this.prisma.projectCurriculumVideo.findUnique({
      where: { id: projectVideoId },
      include: { curriculum: { include: { project: true } } },
    });

    if (!projectVideo) throw new NotFoundException('Project video not found');

    if (projectVideo.videoStatus !== 'READY') {
      throw new BadRequestException(
        'This video is not yet available for playback',
      );
    }

    // Fetch saved progress position for resume
    const progress = await this.prisma.videoProgress.findUnique({
      where: { studentId_projectCurriculumVideoId: { studentId, projectCurriculumVideoId: projectVideoId } },
      select: { lastPositionSec: true },
    });

    // Fetch student info for watermark
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true },
    });

    const { otp, playbackInfo } = await this.vdoCipherService.getPlaybackOtp(
      projectVideo.vdoCipherId!,
      { name: student!.name, email: student!.email },
    );

    return {
      otp,
      playbackInfo,
      videoId: projectVideo.id,
      title: projectVideo.title,
      durationSeconds: projectVideo.durationSeconds,
      initialPosition: progress?.lastPositionSec ?? 0,
    };
  }

  async getProjectProgress(studentId: string, projectId: string) {
    // Get all curriculum videos for the project
    const curriculum = await this.prisma.projectCurriculum.findMany({
      where: { projectId },
      include: {
        videos: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    const allVideoIds = curriculum.flatMap((c) => c.videos.map((v) => v.id));

    // Get all progress records for these videos
    const progressRecords = await this.prisma.videoProgress.findMany({
      where: {
        studentId,
        projectCurriculumVideoId: { in: allVideoIds },
      },
    });

    const progressMap = new Map(
      progressRecords.map((p) => [p.projectCurriculumVideoId, p]),
    );

    let completedCount = 0;
    let totalDuration = 0;
    let watchedDuration = 0;

    const curriculumWithProgress = curriculum.map((c) => ({
      id: c.id,
      week: c.week,
      title: c.title,
      desc: c.desc,
      order: c.order,
      videos: c.videos.map((v) => {
        const prog = progressMap.get(v.id);
        totalDuration += v.durationSeconds;
        watchedDuration += prog?.uniqueSecsWatched ?? 0;
        if (prog?.isCompleted) completedCount++;
        return {
          id: v.id,
          title: v.title,
          durationSeconds: v.durationSeconds,
          isCompleted: prog?.isCompleted ?? false,
          uniqueSecsWatched: prog?.uniqueSecsWatched ?? 0,
          lastPositionSec: prog?.lastPositionSec ?? 0,
        };
      }),
    }));

    const totalVideos = allVideoIds.length;
    const progressPercent = totalVideos > 0
      ? Math.round((completedCount / totalVideos) * 100)
      : 0;

    return {
      projectId,
      totalVideos,
      completedVideos: completedCount,
      progressPercent,
      totalDuration,
      watchedDuration,
      curriculum: curriculumWithProgress,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // ORDERS
  // ─────────────────────────────────────────────────────────────

  async getOrders(studentId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        currency: true,
        gatewayType: true,
        subtotal: true,
        discountAmount: true,
        couponId: true,
        gstPercent: true,
        gstAmount: true,
        totalAmount: true,
        status: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        billingFullName: true,
        billingEmail: true,
        billingPhone: true,
        billingAddress: true,
        billingCity: true,
        billingState: true,
        billingPincode: true,
        createdAt: true,
        items: {
          select: {
            priceAtPurchase: true,
            currency: true,
            course: { select: { id: true, title: true, thumbnailUrl: true } },
          },
        },
      },
    });
    return orders;
  }

  // ─────────────────────────────────────────────────────────────
  // PROFILE — GET, PUT, AVATAR
  // ─────────────────────────────────────────────────────────────

  async getProfile(studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        bio: true,
        phone: true,
        dob: true,
        city: true,
        qualification: true,
        experience: true,
        careerPath: true,
        skills: true,
        _count: {
          select: {
            enrollments: { where: { status: 'active' } },
            certificates: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { _count, ...profile } = user;

    return {
      ...profile,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      stats: {
        enrollmentCount: _count.enrollments,
        certificateCount: _count.certificates,
      },
    };
  }

  async updateProfile(studentId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('Email is already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: studentId },
      data: {
        name: dto.name,
        email: dto.email,
        bio: dto.bio,
        phone: dto.phone,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        city: dto.city,
        qualification: dto.qualification,
        experience: dto.experience,
        careerPath: dto.careerPath,
        skills: dto.skills,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        bio: true,
        phone: true,
        dob: true,
        city: true,
        qualification: true,
        experience: true,
        careerPath: true,
        skills: true,
      },
    });

    return {
      ...updated,
      dob: updated.dob ? updated.dob.toISOString().split('T')[0] : null,
    };
  }

  async updateAvatar(studentId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!user) throw new NotFoundException('User not found');

    const avatarUrl = await this.s3Service.uploadFile(file, 'avatars');
    if (user.avatarUrl) {
      await this.s3Service.deleteByUrl(user.avatarUrl);
    }

    await this.prisma.user.update({
      where: { id: studentId },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }
}
