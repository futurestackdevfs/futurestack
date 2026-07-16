import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('tracks/:id')
  updateTrack(@Param('id') id: string, @Body() dto: UpdateTrackDto) {
    return this.coursesService.updateTrack(id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('tracks/:id')
  deleteTrack(@Param('id') id: string) {
    return this.coursesService.deleteTrack(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('tracks/reorder-featured')
  reorderFeaturedTracks(@Body() dto: ReorderItemsDto) {
    return this.coursesService.reorderFeaturedTracks(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('tracks/:id/feature')
  featureTrack(@Param('id') id: string, @Body() dto: FeatureDto) {
    return this.coursesService.featureTrack(id, dto);
  }

  // ================================================================
  // SECTIONS — update/delete (static "sections" prefix)
  // ================================================================

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.coursesService.updateSection(id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.coursesService.deleteSection(id);
  }

  // ================================================================
  // VIDEOS — update/delete + create (nested under section)
  // ================================================================

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('sections/:sectionId/videos')
  createVideo(@Param('sectionId') sectionId: string, @Body() dto: CreateVideoDto) {
    return this.coursesService.createVideo(sectionId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('videos/:id')
  updateVideo(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.coursesService.updateVideo(id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('videos/:id')
  deleteVideo(@Param('id') id: string) {
    return this.coursesService.deleteVideo(id);
  }

  // ================================================================
  // QUIZZES — update/delete + create (nested under section)
  // ================================================================

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('sections/:sectionId/quizzes')
  createQuiz(@Param('sectionId') sectionId: string, @Body() dto: CreateQuizDto) {
    return this.coursesService.createQuiz(sectionId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch('quizzes/:id')
  updateQuiz(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.coursesService.updateQuiz(id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('quizzes/:id')
  deleteQuiz(@Param('id') id: string) {
    return this.coursesService.deleteQuiz(id);
  }

  // ================================================================
  // RESOURCES — delete (static "resources" prefix)
  // ================================================================

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete('resources/:id')
  deleteResource(@Param('id') id: string) {
    return this.coursesService.deleteResource(id);
  }

  // ================================================================
  // PUBLIC — no auth (called by marketing homepage before any login)
  // ================================================================

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('public/featured-courses')
  featuredCourses() {
    return this.coursesService.featuredCourses();
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('public/featured-tracks')
  featuredTracks() {
    return this.coursesService.featuredTracks();
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('search')
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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('reorder-featured')
  reorderFeaturedCourses(@Body() dto: ReorderItemsDto) {
    return this.coursesService.reorderFeaturedCourses(dto);
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

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id/feature')
  featureCourse(@Param('id') id: string, @Body() dto: FeatureDto) {
    return this.coursesService.featureCourse(id, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteCourse(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/tracks/:trackId')
  linkCourseToTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
    return this.coursesService.linkCourseToTrack(id, trackId);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id/tracks/:trackId')
  unlinkCourseFromTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
    return this.coursesService.unlinkCourseFromTrack(id, trackId);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':courseId/sections')
  createSection(@Param('courseId') courseId: string, @Body() dto: CreateSectionDto) {
    return this.coursesService.createSection(courseId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':courseId/resources')
  createResource(@Param('courseId') courseId: string, @Body() dto: CreateResourceDto) {
    return this.coursesService.createResource(courseId, dto);
  }
}
