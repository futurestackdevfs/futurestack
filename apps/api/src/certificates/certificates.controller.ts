import { Controller, Get, Post, Param, Req, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from './certificates.service';

const GRADIENTS = [
  'linear-gradient(135deg,#4db33d,#2d7ef7)',
  'linear-gradient(135deg,#a855f7,#ec4899)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService
  ) {}

  @Get('my')
  @Auth(Role.STUDENT)
  async getMyCertificates(@Req() req: Request) {
    const user = req.user as { id: string };
    const studentId = user.id;

    // 1. Fetch earned certificates
    const certificates = await this.prisma.certificate.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            trainer: true,
            sections: { include: { videos: true } }
          }
        }
      }
    });

    const earned = certificates.map(cert => {
      const course = cert.course;
      const totalSections = course.sections.length;
      const totalDurationSecs = course.sections.reduce(
        (sum, section) => sum + section.videos.reduce((s, v) => s + v.durationSeconds, 0),
        0
      );
      const totalHours = Math.round((totalDurationSecs / 3600) * 10) / 10;

      return {
        courseId: course.id,
        courseTitle: course.title,
        courseCode: course.code,
        category: course.category,
        description: course.description,
        techStack: course.techStack,
        trainerName: course.trainer?.name ?? null,
        credentialId: cert.credentialId,
        score: cert.score,
        rank: cert.rank,
        totalSections,
        totalHours,
        issuedAt: cert.issuedAt
      };
    });

    // 2. Fetch In-Progress Courses
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'active',
        course: {
          certificates: {
            none: { studentId }
          }
        }
      },
      include: {
        course: {
          include: {
            sections: {
              include: { videos: true, quizzes: true }
            }
          }
        }
      }
    });

    const inProgressVideoIds = enrollments.flatMap(e => e.course.sections.flatMap(s => s.videos.map(v => v.id)));
    const inProgressQuizIds = enrollments.flatMap(e => e.course.sections.flatMap(s => s.quizzes.map(q => q.id)));

    const [videoProgressRows, quizAttemptRows] = await Promise.all([
      this.prisma.videoProgress.findMany({
        where: { studentId, videoId: { in: inProgressVideoIds } }
      }),
      this.prisma.quizAttempt.findMany({
        where: { studentId, quizId: { in: inProgressQuizIds } }
      })
    ]);

    const videoProgressById = new Map(videoProgressRows.map(p => [p.videoId, p]));
    const quizAttemptById = new Map(quizAttemptRows.map(a => [a.quizId, a]));

    const inProgress = enrollments.map(enrollment => {
      const course = enrollment.course;
      let totalItems = 0;
      let completedItems = 0;

      course.sections.forEach(section => {
        section.videos.forEach(v => {
          totalItems++;
          if (videoProgressById.get(v.id)?.isCompleted) completedItems++;
        });
        section.quizzes.forEach(q => {
          totalItems++;
          if (quizAttemptById.get(q.id)?.isCompleted) completedItems++;
        });
      });

      const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        category: course.category,
        progressPercent,
        completedItems,
        totalItems
      };
    });

    // 3. Fetch Locked Courses
    const lockedCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        enrollments: {
          none: { studentId }
        }
      },
      orderBy: { displayOrder: 'asc' },
      take: 10
    });

    const locked = lockedCourses.map(course => ({
      courseId: course.id,
      courseTitle: course.title,
      category: course.category,
      price: course.price
    }));

    return { earned, inProgress, locked };
  }

  @Get('recent')
  async getRecentAchievements() {
    const certs = await this.prisma.certificate.findMany({
      orderBy: { issuedAt: 'desc' },
      select: {
        issuedAt: true,
        student: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    const seenCourses = new Set<string>();
    const seenStudents = new Set<string>();
    const result: { initial: string; name: string; action: string; time: string; gradient: string }[] = [];

    for (const c of certs) {
      if (seenCourses.has(c.course.title)) continue;
      if (seenStudents.has(c.student.name)) continue;
      seenCourses.add(c.course.title);
      seenStudents.add(c.student.name);
      result.push({
        initial: c.student.name.charAt(0).toUpperCase(),
        name: c.student.name,
        action: `Completed ${c.course.title}`,
        time: getRelativeTime(c.issuedAt),
        gradient: GRADIENTS[result.length % GRADIENTS.length],
      });
      if (result.length >= 3) break;
    }

    return result;
  }

  @Post('claim/:courseId')
  @Auth(Role.STUDENT)
  async claimCertificate(
    @Req() req: Request,
    @Param('courseId') courseId: string
  ) {
    const user = req.user as { id: string };
    const result = await this.certificatesService.checkAndIssueCertificate(user.id, courseId);
    return result;
  }

  @Get('my/:courseId')
  @Auth(Role.STUDENT)
  async getCertificateForCourse(
    @Req() req: Request,
    @Param('courseId') courseId: string
  ) {
    const user = req.user as { id: string };
    const studentId = user.id;

    const cert = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: {
        course: {
          include: {
            trainer: true,
            sections: { include: { videos: true } }
          }
        }
      }
    });

    if (!cert) {
      throw new NotFoundException('Certificate not found for this course');
    }

    const course = cert.course;
    const totalSections = course.sections.length;
    const totalDurationSecs = course.sections.reduce(
      (sum, section) => sum + section.videos.reduce((s, v) => s + v.durationSeconds, 0),
      0
    );
    const totalHours = Math.round((totalDurationSecs / 3600) * 10) / 10;

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseCode: course.code,
      category: course.category,
      description: course.description,
      techStack: course.techStack,
      trainerName: course.trainer?.name ?? null,
      credentialId: cert.credentialId,
      score: cert.score,
      rank: cert.rank,
      totalSections,
      totalHours,
      issuedAt: cert.issuedAt
    };
  }
}
