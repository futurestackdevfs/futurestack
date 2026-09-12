import {
  Controller,
  Get,
  Header,
  Post,
  Put,
  Body,
  Param,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { PageSizePipe } from '../common/page-size.pipe';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ─── COURSE REVIEWS ──────────────────────────────────────

  @Auth(Role.STUDENT)
  @Post('courses/:courseId/reviews')
  async createCourseReview(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.createReview(user.id, courseId, dto);
  }

  @Auth(Role.STUDENT)
  @Put('courses/:courseId/reviews/:reviewId')
  async updateCourseReview(
    @Req() req: Request,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.updateReview(user.id, reviewId, dto);
  }

  @Get('courses/:courseId/reviews')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300')
  async getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(10, 100)) limit: number,
  ) {
    return this.reviewsService.getCourseReviews(courseId, page, limit);
  }

  @Auth(Role.STUDENT)
  @Get('courses/:courseId/reviews/my-review')
  async getMyCourseReview(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.reviewsService.getStudentReview(user.id, courseId);
  }

  // ─── TRAINER ─────────────────────────────────────────────

  @Auth(Role.TRAINER)
  @Get('trainer/project-reviews')
  async getTrainerProjectReviews(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.reviewsService.getTrainerProjectReviews(user.id);
  }
}
