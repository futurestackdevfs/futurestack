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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── PUBLIC ──────────────────────────────────────────────────────

  @Get()
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  listActive() {
    return this.projectsService.listActive();
  }

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60')
  getById(@Param('id') id: string) {
    return this.projectsService.getById(id);
  }

  // ── ADMIN ───────────────────────────────────────────────────────

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('admin/all')
  listAll() {
    return this.projectsService.listAll();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Put(':id/curriculum')
  replaceCurriculum(
    @Param('id') id: string,
    @Body() dto: UpdateCurriculumDto,
  ) {
    return this.projectsService.replaceCurriculum(id, dto);
  }
}
