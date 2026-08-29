import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ProjectsService } from './projects.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { UploadCurriculumVideoDto } from './dto/upload-curriculum-video.dto';
import { CreateProjectOrderDto } from './dto/create-order.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  // ── PUBLIC ──────────────────────────────────────────────────────

  @Get()
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  listActive() {
    return this.projectsService.listActive();
  }

  // ── ADMIN (static routes BEFORE :id) ───────────────────────────

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('admin/all')
  listAll() {
    return this.projectsService.listAll();
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('admin/orders')
  listAllOrders() {
    return this.projectsService.listAllOrders();
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('admin/orders/:orderId/status')
  updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: string,
  ) {
    return this.projectsService.updateOrderStatus(orderId, status);
  }

  // ── PROJECT REVIEWS (static routes BEFORE :id) ─────────────────

  @Auth(Role.STUDENT)
  @Post(':id/reviews')
  createProjectReview(
    @Req() req: Request,
    @Param('id') projectId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.createProjectReview(user.id, projectId, dto);
  }

  @Auth(Role.STUDENT)
  @Put(':id/reviews/:reviewId')
  updateProjectReview(
    @Req() req: Request,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.updateReview(user.id, reviewId, dto);
  }

  @Get(':id/reviews')
  getProjectReviews(
    @Param('id') projectId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.reviewsService.getProjectReviews(
      projectId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
    );
  }

  @Auth(Role.STUDENT)
  @Get(':id/reviews/me')
  getMyProjectReview(
    @Req() req: Request,
    @Param('id') projectId: string,
  ) {
    const user = req.user as { id: string };
    return this.reviewsService.getStudentProjectReview(user.id, projectId);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  // ── PUBLIC: :id routes ─────────────────────────────────────────

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  getById(@Param('id') id: string) {
    return this.projectsService.getById(id);
  }

  @Post(':id/orders')
  createOrder(
    @Param('id') id: string,
    @Body() dto: CreateProjectOrderDto,
  ) {
    return this.projectsService.createOrder(id, dto);
  }

  // ── ADMIN: :id routes ──────────────────────────────────────────

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Put(':id/curriculum')
  replaceCurriculum(
    @Param('id') id: string,
    @Body() dto: UpdateCurriculumDto,
  ) {
    return this.projectsService.replaceCurriculum(id, dto);
  }

  // ── DEMO VIDEO UPLOAD ───────────────────────────────────────────

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/demo-video/upload-credentials')
  async getDemoVideoUploadCredentials(
    @Param('id') id: string,
    @Query('title') title: string,
  ) {
    if (!title) {
      title = 'Project Demo Video';
    }
    return this.projectsService.getDemoVideoUploadCredentials(id, title);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/demo-video/complete')
  async completeDemoVideoUpload(
    @Param('id') id: string,
    @Body('vdoCipherId') vdoCipherId: string,
  ) {
    if (!vdoCipherId) {
      throw new BadRequestException('vdoCipherId is required');
    }
    return this.projectsService.completeDemoVideoUpload(id, vdoCipherId);
  }

  // ── CURRICULUM VIDEO UPLOAD ─────────────────────────────────────

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/curriculum/videos/upload-credentials')
  async getCurriculumVideoUploadCredentials(
    @Param('id') id: string,
    @Body() dto: UploadCurriculumVideoDto,
  ) {
    return this.projectsService.getCurriculumVideoUploadCredentials(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/curriculum/videos/:videoId/complete')
  async completeCurriculumVideoUpload(
    @Param('id') id: string,
    @Param('videoId') videoId: string,
  ) {
    return this.projectsService.completeCurriculumVideoUpload(id, videoId);
  }

  // ── ORDERS (admin) ──────────────────────────────────────────────

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get(':id/orders')
  listOrders(@Param('id') id: string) {
    return this.projectsService.listOrders(id);
  }
}
