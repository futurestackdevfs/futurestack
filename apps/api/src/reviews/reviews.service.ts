import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // ─── COURSE REVIEWS ──────────────────────────────────────

  async createReview(
    studentId: string,
    courseId: string,
    dto: CreateReviewDto,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });

    if (!enrollment) {
      throw new BadRequestException(
        'You must be enrolled in the course to leave a review.',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        courseId_studentId: { courseId, studentId },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this course. Please update your existing review instead.',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        courseId,
        studentId,
      },
    });

    await this.recalculateRatings(courseId);
    return review;
  }

  async updateReview(
    studentId: string,
    reviewId: string,
    dto: CreateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.studentId !== studentId)
      throw new BadRequestException('Not your review');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    if (review.courseId) await this.recalculateRatings(review.courseId);
    if (review.projectId) await this.recalculateProjectRatings(review.projectId);
    return updated;
  }

  async getCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { courseId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.review.count({ where: { courseId } }),
    ]);

    return { data, total, page, limit };
  }

  async getStudentReview(studentId: string, courseId: string) {
    const review = await this.prisma.review.findUnique({
      where: {
        courseId_studentId: { courseId, studentId },
      },
    });

    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  // ─── PROJECT REVIEWS ─────────────────────────────────────

  async createProjectReview(
    studentId: string,
    projectId: string,
    dto: CreateReviewDto,
  ) {
    // Check if student purchased the project
    const order = await this.prisma.projectOrder.findFirst({
      where: {
        projectId,
        studentId,
        status: { not: 'cancelled' },
      },
    });

    if (!order) {
      throw new BadRequestException(
        'You must have purchased this project to leave a review.',
      );
    }

    // Check if already reviewed
    const existing = await this.prisma.review.findUnique({
      where: {
        projectId_studentId: { projectId, studentId },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this project. Please update your existing review instead.',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        projectId,
        studentId,
      },
    });

    await this.recalculateProjectRatings(projectId);
    return review;
  }

  async getProjectReviews(
    projectId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.review.count({ where: { projectId } }),
    ]);

    return { data, total, page, limit };
  }

  async getStudentProjectReview(studentId: string, projectId: string) {
    const review = await this.prisma.review.findUnique({
      where: {
        projectId_studentId: { projectId, studentId },
      },
    });

    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async getTrainerProjectReviews(trainerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        projectId: { not: null },
        project: { trainerId },
      },
      include: {
        student: { select: { name: true, avatarUrl: true } },
        project: { select: { name: true } },
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
      projectName: r.project?.name ?? '',
    }));
  }

  private async recalculateProjectRatings(projectId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { projectId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const rating = aggregate._avg.rating || 0;
    const reviewCount = aggregate._count.id;

    await this.prisma.project.update({
      where: { id: projectId },
      data: { rating, reviewCount },
    });
  }

  // ─── SHARED ──────────────────────────────────────────────

  private async recalculateRatings(courseId: string) {
    const courseAggregate = await this.prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const averageRating = courseAggregate._avg.rating || 0;
    const reviewCount = courseAggregate._count.id;

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        averageRating,
        reviewCount,
      },
      select: { trainerId: true },
    });

    if (course.trainerId) {
      const trainerAggregate = await this.prisma.course.aggregate({
        where: { trainerId: course.trainerId, reviewCount: { gt: 0 } },
        _avg: { averageRating: true },
      });

      const trainerRating = trainerAggregate._avg.averageRating || 0;

      await this.prisma.user.update({
        where: { id: course.trainerId },
        data: { rating: trainerRating },
      });
    }
  }
}
