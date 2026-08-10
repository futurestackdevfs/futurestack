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

  async createReview(
    studentId: string,
    courseId: string,
    dto: CreateReviewDto,
  ) {
    // Check if enrolled
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

    // Check if already reviewed
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
        ...dto,
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

    await this.recalculateRatings(review.courseId);
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

  private async recalculateRatings(courseId: string) {
    const courseAggregate = await this.prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const averageRating = courseAggregate._avg.rating || 0;
    const reviewCount = courseAggregate._count.id;

    // Update Course
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        averageRating,
        reviewCount,
      },
      select: { trainerId: true },
    });

    // Update Trainer
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
