import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndIssueCertificate(
    studentId: string,
    courseId: string,
  ): Promise<{ issued: boolean; credentialId?: string }> {
    // Check if certificate already exists
    const existingCert = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });

    if (existingCert) {
      return { issued: false };
    }

    // Count total completable items in the course
    const totalVideos = await this.prisma.video.count({
      where: { section: { courseId } },
    });

    const totalQuizzes = await this.prisma.quiz.count({
      where: { section: { courseId } },
    });

    // Count completed items for this student
    const completedVideos = await this.prisma.videoProgress.count({
      where: { studentId, isCompleted: true, video: { section: { courseId } } },
    });

    const completedQuizzes = await this.prisma.quizAttempt.count({
      where: { studentId, isCompleted: true, quiz: { section: { courseId } } },
    });

    // A course with nothing to complete can't be "completed" — guard against
    // issuing a certificate for an empty / not-yet-populated course.
    if (totalVideos + totalQuizzes === 0) {
      return { issued: false };
    }

    // If completed is less than total, not complete yet
    if (completedVideos < totalVideos || completedQuizzes < totalQuizzes) {
      return { issued: false };
    }

    // Calculate average quiz score
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId, quiz: { section: { courseId } } },
    });

    const score =
      attempts.length > 0
        ? Math.round(
            attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
          )
        : null;

    // Calculate rank - count how many OTHER students received a certificate for this course before this one
    const rank =
      (await this.prisma.certificate.count({ where: { courseId } })) + 1;

    // Generate credential ID using the course code field
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { code: true },
    });

    const year = new Date().getFullYear();
    const sequence = String(rank).padStart(3, '0');
    const safeCode =
      course?.code ?? `CRS-${courseId.substring(0, 4).toUpperCase()}`;
    const credentialId = `FS-${year}-${safeCode}-${sequence}`;

    // Create the certificate. Two concurrent requests (e.g. a double-click) can
    // both pass the findUnique check above, so a unique-constraint violation
    // here just means another request already issued it — not an error.
    try {
      await this.prisma.certificate.create({
        data: { studentId, courseId, credentialId, score, rank },
      });
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        (err as { code?: string }).code === 'P2002'
      ) {
        return { issued: false };
      }
      throw err;
    }

    return { issued: true, credentialId };
  }
}
