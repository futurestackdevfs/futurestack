import {
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { PageSizePipe } from '../common/page-size.pipe';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Audit } from '../audit/audit.decorator';

@Controller()
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // AI generation from the admin / content-manager dashboard (staff JWT).
  // Returns a job id immediately (202); research → write → fact-check runs in
  // the background (in-process, via BlogGenerationService) and the result is
  // saved as a DRAFT.
  @Post('articles/admin/generate')
  @HttpCode(202)
  @Auth(Role.ADMIN)
  @Audit({ action: 'GENERATE', entity: 'BlogPost', idFrom: 'none' })
  generateFromDashboard(@Body() dto: GenerateArticleDto, @Req() req: Request) {
    const user = req.user as { id: string; email: string; name: string; role: string };
    return this.blogService.startGeneration(dto.topic, { id: user.id, role: user.role, email: user.email, name: user.name });
  }

  // Progress of a generation job: { status, stage, result?, error? }.
  @Get('articles/admin/generate/:jobId')
  @Auth(Role.ADMIN)
  generationStatus(@Param('jobId') jobId: string) {
    return this.blogService.getGeneration(jobId);
  }

  // Cancels a running job — stops the actual Claude call, not just the UI poll.
  @Delete('articles/admin/generate/:jobId')
  @Auth(Role.ADMIN)
  cancelGeneration(@Param('jobId') jobId: string) {
    return this.blogService.cancelGeneration(jobId);
  }

  @Patch('articles/admin/:id/publish')
  @Auth(Role.ADMIN)
  async publishFromDashboard(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  // Manual creation — the fallback when AI generation isn't configured/fails.
  @Post('articles/admin')
  @Auth(Role.ADMIN)
  @Audit({ action: 'CREATE', entity: 'BlogPost', idFrom: 'response' })
  async createManual(@Body() dto: CreateBlogPostDto) {
    return this.blogService.createManual(dto);
  }

  @Patch('articles/admin/:id')
  @Auth(Role.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'BlogPost', idFrom: 'param' })
  async updateFromDashboard(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @Delete('articles/admin/:id')
  @Auth(Role.ADMIN)
  @Audit({ action: 'DELETE', entity: 'BlogPost', idFrom: 'param' })
  async removeFromDashboard(@Param('id') id: string) {
    return this.blogService.remove(id);
  }

  @Get('articles')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(10, 100)) limit: number,
  ) {
    return this.blogService.findAllPublished(page, limit);
  }

  @Get('articles/admin')
  @Auth(Role.ADMIN)
  async findAllForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new PageSizePipe(20, 100)) limit: number,
  ) {
    return this.blogService.findAllForAdmin(page, limit);
  }

  @Get('articles/:slug')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  async findOne(@Param('slug') slug: string) {
    return this.blogService.findOnePublished(slug);
  }
}
