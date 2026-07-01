import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
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

// IMPORTANT — route ordering: any route with a static first segment (tracks,
// sections, videos, quizzes, resources) MUST be defined before the bare
// @Get(':id') / @Patch(':id') / @Delete(':id') handlers, otherwise Express
// will match e.g. GET /courses/tracks as id="tracks" instead.

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
  createVideo(@Param('sectionId') sectionId: string, @Body() dto: CreateVideoDto) {
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
  createQuiz(@Param('sectionId') sectionId: string, @Body() dto: CreateQuizDto) {
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

  // ================================================================
  // COURSES — :id routes  (must come after all static-prefix routes)
  // ================================================================

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get(':id')
  getCourse(@Param('id') id: string) {
    return this.coursesService.getCourse(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteCourse(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':id/tracks/:trackId')
  linkCourseToTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
    return this.coursesService.linkCourseToTrack(id, trackId);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id/tracks/:trackId')
  unlinkCourseFromTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
    return this.coursesService.unlinkCourseFromTrack(id, trackId);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':courseId/sections')
  createSection(@Param('courseId') courseId: string, @Body() dto: CreateSectionDto) {
    return this.coursesService.createSection(courseId, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post(':courseId/resources')
  createResource(@Param('courseId') courseId: string, @Body() dto: CreateResourceDto) {
    return this.coursesService.createResource(courseId, dto);
  }
}
