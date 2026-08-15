import {
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
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { CoursesService } from './courses.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { SetCourseCareerPathDto } from './dto/set-course-career-path.dto';
import { FeatureDto } from './dto/feature.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

// IMPORTANT — route ordering: any route with a static first segment (tracks,
// sections, videos, quizzes, resources, public, reorder-featured) MUST be
// defined before the bare @Get(':id') / @Patch(':id') / @Delete(':id')
// handlers, otherwise Express will treat the prefix as a dynamic id param.

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ================================================================
  // TRACKS
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('tracks')
  createTrack(@Body() dto: CreateTrackDto) {
    return this.coursesService.createTrack(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('tracks')
  listTracks() {
    return this.coursesService.listTracks();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('tracks/:id')
  updateTrack(@Param('id') id: string, @Body() dto: UpdateTrackDto) {
    return this.coursesService.updateTrack(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('tracks/:id')
  deleteTrack(@Param('id') id: string) {
    return this.coursesService.deleteTrack(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('tracks/reorder-featured')
  reorderFeaturedTracks(@Body() dto: ReorderItemsDto) {
    return this.coursesService.reorderFeaturedTracks(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('tracks/:id/feature')
  featureTrack(@Param('id') id: string, @Body() dto: FeatureDto) {
    return this.coursesService.featureTrack(id, dto);
  }

  // ================================================================
  // HERO SLIDES — created/managed inside Featured Manager
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('hero-slides')
  createHeroSlide(@Body() dto: CreateHeroSlideDto) {
    return this.coursesService.createHeroSlide(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('hero-slides')
  listHeroSlides() {
    return this.coursesService.listHeroSlides();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('hero-slides/:id')
  deleteHeroSlide(@Param('id') id: string) {
    return this.coursesService.deleteHeroSlide(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('hero-slides/reorder-featured')
  reorderHeroSlides(@Body() dto: ReorderItemsDto) {
    return this.coursesService.reorderHeroSlides(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('hero-slides/:id/feature')
  featureHeroSlide(@Param('id') id: string, @Body() dto: FeatureDto) {
    return this.coursesService.featureHeroSlide(id, dto);
  }

  @Get('public/featured-hero-slides')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  featuredHeroSlides() {
    return this.coursesService.featuredHeroSlides();
  }

  // ================================================================
  // SECTIONS — update/delete (static "sections" prefix)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.coursesService.updateSection(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.coursesService.deleteSection(id);
  }

  // ================================================================
  // VIDEOS — update/delete + create (nested under section)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('sections/:sectionId/videos')
  createVideo(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateVideoDto,
  ) {
    return this.coursesService.createVideo(sectionId, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('videos/:id')
  updateVideo(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.coursesService.updateVideo(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('videos/:id')
  deleteVideo(@Param('id') id: string) {
    return this.coursesService.deleteVideo(id);
  }

  // ================================================================
  // QUIZZES — update/delete + create (nested under section)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('sections/:sectionId/quizzes')
  createQuiz(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.coursesService.createQuiz(sectionId, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('quizzes/:id')
  updateQuiz(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.coursesService.updateQuiz(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('quizzes/:id')
  deleteQuiz(@Param('id') id: string) {
    return this.coursesService.deleteQuiz(id);
  }

  // ================================================================
  // RESOURCES — delete (static "resources" prefix)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('resources/:id')
  deleteResource(@Param('id') id: string) {
    return this.coursesService.deleteResource(id);
  }

  // ================================================================
  // PUBLIC — no auth (called by marketing homepage before any login)
  // ================================================================

  @Get('public/featured-courses')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  featuredCourses() {
    return this.coursesService.featuredCourses();
  }

  @Get('public/featured-tracks')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  featuredTracks() {
    return this.coursesService.featuredTracks();
  }

  @Get('public/tracks/:id/courses')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  trackCourses(@Param('id') id: string) {
    return this.coursesService.trackCourses(id);
  }

  @Get('public/cards')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  publicCards(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('filters') filters?: string,
    @Query('fields') fields?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const pp = perPage ? parseInt(perPage, 10) : 12;
    return this.coursesService.findAllCards({
      page: p,
      perPage: pp,
      search,
      sort,
      filters: filters ? JSON.parse(filters) : undefined,
      fields,
    });
  }

  @Get('public/slug/:slug')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  publicCourseBySlug(@Param('slug') slug: string) {
    return this.coursesService.publicCourseBySlug(slug);
  }

  @Get('public/related/:id')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  relatedCourses(@Param('id') id: string) {
    return this.coursesService.relatedCourses(id);
  }

  @Get('public/:id')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  publicCourseDetail(@Param('id') id: string) {
    return this.coursesService.publicCourseDetail(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('public/videos/:videoId/otp')
  getPublicVideoOtp(@Param('videoId') videoId: string) {
    return this.coursesService.getPublicVideoOtp(videoId);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('search')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=300, stale-while-revalidate=60')
  searchCourses(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('skillLevel') skillLevel?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.searchCourses({
      q,
      category,
      skillLevel,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // ================================================================
  // COURSES — list + create (no dynamic segment at root level)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post()
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get()
  listCourses() {
    return this.coursesService.listCourses();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('reorder-featured')
  reorderFeaturedCourses(@Body() dto: ReorderItemsDto) {
    return this.coursesService.reorderFeaturedCourses(dto);
  }

  // ================================================================
  // TRAINER — revenue & payouts (static "trainer" prefix)
  // ================================================================

  @Auth(Role.TRAINER)
  @Get('trainer/revenue')
  trainerRevenue(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.coursesService.trainerRevenue(user.id);
  }

  @Auth(Role.TRAINER)
  @Get('trainer/payouts')
  trainerPayouts(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.coursesService.trainerPayouts(user.id);
  }

  // ================================================================
  // COURSES — :id routes  (must come after all static-prefix routes)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get(':id')
  getCourse(@Param('id') id: string) {
    return this.coursesService.getCourse(id);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':courseId/overview')
  getCourseOverview(@Param('courseId') courseId: string) {
    return this.coursesService.getCourseOverview(courseId);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id/feature')
  featureCourse(@Param('id') id: string, @Body() dto: FeatureDto) {
    return this.coursesService.featureCourse(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteCourse(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/tracks/:trackId')
  linkCourseToTrack(
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.coursesService.linkCourseToTrack(id, trackId);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id/tracks/:trackId')
  unlinkCourseFromTrack(
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.coursesService.unlinkCourseFromTrack(id, trackId);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Put(':id/career-path')
  setCourseCareerPath(
    @Param('id') id: string,
    @Body() dto: SetCourseCareerPathDto,
  ) {
    return this.coursesService.setCourseCareerPath(id, dto.title);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':courseId/sections')
  createSection(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.coursesService.createSection(courseId, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':courseId/resources')
  createResource(
    @Param('courseId') courseId: string,
    @Body() dto: CreateResourceDto,
  ) {
    return this.coursesService.createResource(courseId, dto);
  }
}
