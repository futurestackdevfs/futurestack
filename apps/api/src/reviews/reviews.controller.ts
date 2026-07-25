import { Controller, Get, Post, Put, Body, Param, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('courses/:courseId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Auth(Role.STUDENT)
  @Post()
  async createReview(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.createReview(user.id, courseId, dto);
  }

  @Auth(Role.STUDENT)
  @Put(':reviewId')
  async updateReview(
    @Req() req: Request,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.updateReview(user.id, reviewId, dto);
  }

  @Get()
  async getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getCourseReviews(courseId, page, limit);
  }

  @Auth(Role.STUDENT)
  @Get('me')
  async getMyReview(
    @Req() req: Request,
    @Param('courseId') courseId: string,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.getStudentReview(user.id, courseId);
  }
}
