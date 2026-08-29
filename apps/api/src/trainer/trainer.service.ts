import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { resolveTrainerSharePercent, computeTrainerShare } from '../payment-settings/share.util';
import { UpdateProfileDto } from '../student/dto/update-profile.dto';

@Injectable()
export class TrainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async getDashboard(trainerId: string) {
    const [
      courses,
      totalStudentsData,
      revenueData,
      pendingPayouts,
      doubtsCount,
    ] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where: { trainerId },
        include: {
          _count: { select: { enrollments: true } },
          enrollments: {
            include: { revenueLedger: true },
          },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { course: { trainerId } },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      this.prisma.revenueLedger.aggregate({
        where: { trainerId },
        _sum: { trainerShare: true },
      }),
      this.prisma.payout.aggregate({
        where: { trainerId, status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.courseDiscussion.count({
        where: { course: { trainerId }, tag: 'DOUBT', isAnswered: false },
      }),
    ]);

    const totalRevenue = revenueData._sum.trainerShare || 0;
    const paidOut = pendingPayouts._sum.amount || 0;
    const pendingPayout = totalRevenue - paidOut;

    const recentEnrollmentsRaw = await this.prisma.enrollment.findMany({
      where: { course: { trainerId } },
      orderBy: { enrolledAt: 'desc' },
      take: 5,
      include: {
        student: true,
        course: true,
        revenueLedger: true,
      },
    });

    const recentEnrollments = recentEnrollmentsRaw.map((e) => ({
      studentName: e.student.name,
      courseTitle: e.course.title,
      amountPaid: e.amountPaid,
      trainerShare: e.revenueLedger?.trainerShare || 0,
      enrolledAt: e.enrolledAt,
    }));

    const coursesSummary = courses.map((c) => {
      const revenue = c.enrollments.reduce(
        (sum, e) => sum + (e.revenueLedger?.trainerShare || 0),
        0,
      );
      return {
        courseId: c.id,
        courseTitle: c.title,
        enrollmentCount: c._count.enrollments,
        revenue,
      };
    });

    return {
      totalStudents: totalStudentsData.length,
      totalRevenue,
      pendingPayout,
      unresolvedDoubts: doubtsCount,
      recentEnrollments,
      courses: coursesSummary,
    };
  }

  async getRevenue(trainerId: string) {
    const [settings, trainer, payouts] = await Promise.all([
      this.prisma.paymentSettings.findFirst(),
      this.prisma.user.findUnique({
        where: { id: trainerId },
        select: { trainerSharePercent: true },
      }),
      this.prisma.payout.findMany({
        where: { trainerId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const trainerSharePercent = resolveTrainerSharePercent(
      trainer?.trainerSharePercent,
      settings?.trainerSharePercent,
    );

    // Revenue is computed from PAID orders only — same source of truth as the
    // admin payments page — so both consoles always reconcile. The order
    // discount is allocated proportionally across items.
    const paidOrders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        items: { some: { course: { trainerId } } },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            course: {
              select: { id: true, title: true, trainerId: true },
            },
          },
        },
      },
    });

    const courseBreakdownMap = new Map<string, any>();
    const studentRegistrations: {
      studentName: string;
      courseTitle: string;
      courseFee: number;
      paidSoFar: number;
      enrolledOn: Date;
      paymentMethod: string | null;
      trainerShare: number;
    }[] = [];
    let totalGross = 0;
    let totalPlatformCut = 0;
    let totalTrainerShare = 0;

    for (const order of paidOrders) {
      if (!order.subtotal || order.subtotal <= 0) continue;
      const ratio = order.totalAmount / order.subtotal;
      for (const item of order.items) {
        if (item.course.trainerId !== trainerId) continue;
        const effective = Math.round(item.priceAtPurchase * ratio * 100) / 100;
        const { trainerShare, platformCut } = computeTrainerShare(
          effective,
          trainerSharePercent,
        );
        totalGross += effective;
        totalPlatformCut += platformCut;
        totalTrainerShare += trainerShare;

        if (!courseBreakdownMap.has(item.course.id)) {
          courseBreakdownMap.set(item.course.id, {
            courseId: item.course.id,
            courseTitle: item.course.title,
            enrollmentCount: 0,
            totalFees: 0,
            collectedSoFar: 0,
            collectionPct: 100,
            trainerShare: 0,
          });
        }
        const cb = courseBreakdownMap.get(item.course.id);
        cb.enrollmentCount += 1;
        cb.totalFees += effective;
        cb.collectedSoFar += effective;
        cb.trainerShare += trainerShare;

        studentRegistrations.push({
          studentName: order.user?.name ?? 'Unknown',
          courseTitle: item.course.title,
          courseFee: effective,
          paidSoFar: effective,
          enrolledOn: order.createdAt,
          paymentMethod: order.paymentMethod ?? null,
          trainerShare,
        });
      }
    }

    studentRegistrations.sort(
      (a, b) => b.enrolledOn.getTime() - a.enrolledOn.getTime(),
    );

    const paidOut = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPayout = totalTrainerShare - paidOut;

    return {
      summary: {
        totalGross,
        totalPlatformCut,
        totalTrainerShare,
        paidOut,
        pendingPayout,
        trainerSharePercent,
      },
      courseBreakdown: Array.from(courseBreakdownMap.values()),
      studentRegistrations,
      payoutHistory: payouts.map((p) => ({
        id: p.id,
        period: p.period,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }

  async getStudents(trainerId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course: { trainerId } },
      include: {
        student: true,
        course: {
          include: {
            sections: {
              include: {
                _count: { select: { videos: true } },
              },
            },
          },
        },
      },
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const courseIds = enrollments.map((e) => e.courseId);

    const [videoProgress, lastActivities] = await Promise.all([
      this.prisma.videoProgress.findMany({
        where: {
          studentId: { in: studentIds },
          video: { section: { courseId: { in: courseIds } } },
          isCompleted: true,
        },
        include: { video: { include: { section: true } } },
      }),
      this.prisma.videoProgress.findMany({
        where: {
          studentId: { in: studentIds },
          video: { section: { courseId: { in: courseIds } } },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          studentId: true,
          updatedAt: true,
        },
      }),
    ]);

    const completedMap = new Map<string, number>();
    for (const p of videoProgress) {
      if (p.video) {
        const key = `${p.studentId}_${p.video.section.courseId}`;
        completedMap.set(key, (completedMap.get(key) || 0) + 1);
      }
    }

    const lastActiveMap = new Map<string, Date>();
    for (const la of lastActivities) {
      if (!lastActiveMap.has(la.studentId)) {
        lastActiveMap.set(la.studentId, la.updatedAt);
      }
    }

    return enrollments.map((e) => {
      const totalVideos = e.course.sections.reduce(
        (sum, s) => sum + s._count.videos,
        0,
      );
      const key = `${e.studentId}_${e.courseId}`;
      const completedVideos = completedMap.get(key) || 0;
      const progressPercent =
        totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

      const modulesDone = e.course.sections.reduce((sum, s) => {
        const sectionVideos = s._count.videos;
        const completedInSection = videoProgress.filter(
          (p) =>
            p.studentId === e.studentId &&
            p.video?.section.courseId === e.courseId &&
            p.video?.sectionId === s.id &&
            p.isCompleted,
        ).length;
        return sum + (completedInSection >= sectionVideos && sectionVideos > 0 ? 1 : 0);
      }, 0);
      const totalModules = e.course.sections.length;

      let flag: string = 'On Track';
      if (progressPercent < 30) {
        flag = 'Falling Behind';
      } else if (progressPercent >= 70 && modulesDone >= totalModules * 0.7) {
        flag = 'Ready for Next Module';
      }

      const lastActive = lastActiveMap.get(e.studentId);

      return {
        id: parseInt(e.id.slice(0, 8), 16) || Math.floor(Math.random() * 10000),
        name: e.student.name,
        email: e.student.email,
        batchCode: e.course.code ?? e.course.title.slice(0, 8).toUpperCase(),
        progressPct: progressPercent,
        modulesDone,
        totalModules,
        lastActive: lastActive ? lastActive.toISOString().slice(0, 10) : e.enrolledAt.toISOString().slice(0, 10),
        flag,
        flaggedToCoordinator: e.student.flaggedToCoordinator,
        flagReason: e.student.flagReason,
      };
    });
  }

  async getDoubts(trainerId: string) {
    const doubts = await this.prisma.courseDiscussion.findMany({
      where: {
        course: { trainerId },
        tag: 'DOUBT',
        isAnswered: false,
      },
      include: {
        course: true,
        author: true,
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return doubts.map((d) => ({
      messageId: d.id,
      courseTitle: d.course.title,
      studentName: d.author.name,
      body: d.body,
      tag: d.tag,
      createdAt: d.createdAt,
      replyCount: d._count.replies,
    }));
  }

  async getProjects(trainerId: string) {
    const projects = await this.prisma.project.findMany({
      where: { trainerId },
      include: {
        _count: { select: { orders: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      tech: p.tech,
      category: p.category,
      level: p.level,
      status: p.status,
      price: p.price,
      enrolled: p._count.orders,
      duration: p.duration,
      updatedAt: p.updatedAt,
    }));
  }

  async flagStudent(trainerId: string, studentId: string, reason?: string) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        flaggedToCoordinator: true,
        flagReason: reason || null,
      },
    });

    return { success: true, message: `${student.name} flagged to coordinator` };
  }

  async getReviews(trainerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { course: { trainerId } },
      include: {
        student: { select: { name: true, avatarUrl: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      studentName: r.student.name,
      studentAvatar: r.student.avatarUrl,
      courseTitle: r.course?.title ?? '',
    }));
  }

  // ────────────────────────────────────────────────
  // PROFILE — GET, PUT, AVATAR
  // ────────────────────────────────────────────────

  async getProfile(trainerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: trainerId },
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
        yearsExperience: true,
        rating: true,
        // Trainer stats
        coursesTaught: { select: { id: true } },
        certificates: { select: { id: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const courseCount = user.coursesTaught.length;
    const certificateCount = user.certificates.length;

    const { coursesTaught, certificates, ...profile } = user;

    return {
      ...profile,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      stats: { courseCount, certificateCount },
    };
  }

  async updateProfile(trainerId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: trainerId },
      data: {
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
        yearsExperience: true,
        rating: true,
      },
    });

    return {
      ...updated,
      dob: updated.dob ? updated.dob.toISOString().split('T')[0] : null,
    };
  }

  async updateAvatar(trainerId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });
    if (!user) throw new NotFoundException('User not found');

    const avatarUrl = await this.s3Service.uploadFile(file, 'avatars');
    if (user.avatarUrl) {
      await this.s3Service.deleteByUrl(user.avatarUrl);
    }

    await this.prisma.user.update({
      where: { id: trainerId },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }
}
