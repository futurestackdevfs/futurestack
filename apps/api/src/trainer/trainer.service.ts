import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { UpdateProfileDto } from '../student/dto/update-profile.dto';
import { extname, join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

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
    const [revenueLedger, payouts, enrollments] =
      await this.prisma.$transaction([
        this.prisma.revenueLedger.findMany({
          where: { trainerId },
        }),
        this.prisma.payout.findMany({
          where: { trainerId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.enrollment.findMany({
          where: { course: { trainerId } },
          include: {
            student: true,
            course: true,
            revenueLedger: true,
          },
        }),
      ]);

    const totalGross = revenueLedger.reduce((sum, r) => sum + r.gross, 0);
    const totalPlatformCut = revenueLedger.reduce(
      (sum, r) => sum + r.platformCut,
      0,
    );
    const totalTrainerShare = revenueLedger.reduce(
      (sum, r) => sum + r.trainerShare,
      0,
    );
    const paidOut = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPayout = totalTrainerShare - paidOut;

    const courseBreakdownMap = new Map<string, any>();
    for (const e of enrollments) {
      if (!courseBreakdownMap.has(e.courseId)) {
        courseBreakdownMap.set(e.courseId, {
          courseId: e.course.id,
          courseTitle: e.course.title,
          enrollmentCount: 0,
          totalFees: 0,
          collectedSoFar: 0,
          collectionPct: 100,
          trainerShare: 0,
        });
      }
      const cb = courseBreakdownMap.get(e.courseId);
      cb.enrollmentCount += 1;
      cb.totalFees += e.revenueLedger?.gross || 0;
      cb.collectedSoFar += e.revenueLedger?.gross || 0;
      cb.trainerShare += e.revenueLedger?.trainerShare || 0;
    }

    const studentRegistrations = enrollments.map((e) => ({
      studentName: e.student.name,
      courseTitle: e.course.title,
      courseFee: e.amountPaid,
      paidSoFar: e.amountPaid,
      enrolledOn: e.enrolledAt,
      trainerShare: e.revenueLedger?.trainerShare || 0,
    }));

    return {
      summary: {
        totalGross,
        totalPlatformCut,
        totalTrainerShare,
        paidOut,
        pendingPayout,
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

    const [videoProgress, certificates] = await Promise.all([
      this.prisma.videoProgress.findMany({
        where: {
          studentId: { in: studentIds },
          video: { section: { courseId: { in: courseIds } } },
          isCompleted: true,
        },
        include: { video: { include: { section: true } } },
      }),
      this.prisma.certificate.findMany({
        where: { studentId: { in: studentIds }, courseId: { in: courseIds } },
      }),
    ]);

    const completedMap = new Map<string, number>();
    for (const p of videoProgress) {
      const key = `${p.studentId}_${p.video.section.courseId}`;
      completedMap.set(key, (completedMap.get(key) || 0) + 1);
    }

    const certMap = new Set(
      certificates.map((c) => `${c.studentId}_${c.courseId}`),
    );

    return enrollments.map((e) => {
      const totalVideos = e.course.sections.reduce(
        (sum, s) => sum + s._count.videos,
        0,
      );
      const key = `${e.studentId}_${e.courseId}`;
      const completedVideos = completedMap.get(key) || 0;
      const progressPercent =
        totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

      return {
        studentName: e.student.name,
        courseTitle: e.course.title,
        enrolledAt: e.enrolledAt,
        progressPercent,
        hasCertificate: certMap.has(key),
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
      courseTitle: r.course.title,
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

    let avatarUrl: string;
    if (this.s3Service.isConfigured()) {
      avatarUrl = await this.s3Service.uploadFile(file, 'avatars');
      if (user.avatarUrl) {
        await this.s3Service.deleteByUrl(user.avatarUrl);
      }
    } else {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + extname(file.originalname);
      const dir = join(__dirname, '../../public/uploads/avatars');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, filename), file.buffer);
      avatarUrl = `/uploads/avatars/${filename}`;
    }

    await this.prisma.user.update({
      where: { id: trainerId },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }
}
