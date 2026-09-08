import {
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { BlogService } from './blog.service';
import { BlogApiKeyGuard } from './blog-api-key.guard';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller()
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post('internal/articles')
  @UseGuards(BlogApiKeyGuard)
  async create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto);
  }

  // AI generation — callable by the n8n pipeline (x-api-key) …
  @Post('internal/articles/generate')
  @UseGuards(BlogApiKeyGuard)
  async generateInternal(@Body() dto: GenerateArticleDto) {
    return this.blogService.generateArticle(dto.topic);
  }

  // … or straight from the admin / content-manager dashboard (staff JWT).
  @Post('articles/admin/generate')
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  async generateFromDashboard(@Body() dto: GenerateArticleDto) {
    return this.blogService.generateArticle(dto.topic);
  }

  @Patch('internal/articles/:id/publish')
  @UseGuards(BlogApiKeyGuard)
  async publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Patch('articles/admin/:id/publish')
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  async publishFromDashboard(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Get('articles')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.blogService.findAllPublished(page, limit);
  }

  @Get('articles/admin')
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  async findAllForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.blogService.findAllForAdmin(page, limit);
  }

  @Get('articles/:slug')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  async findOne(@Param('slug') slug: string) {
    return this.blogService.findOnePublished(slug);
  }
}
