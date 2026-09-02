import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogApiKeyGuard } from './blog-api-key.guard';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';

@Controller()
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post('internal/articles')
  @UseGuards(BlogApiKeyGuard)
  async create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto);
  }

  @Patch('internal/articles/:id/publish')
  @UseGuards(BlogApiKeyGuard)
  async publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Get('articles')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.blogService.findAllPublished(page, limit);
  }

  @Get('articles/admin')
  async findAllForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.blogService.findAllForAdmin(page, limit);
  }

  @Get('articles/:slug')
  async findOne(@Param('slug') slug: string) {
    return this.blogService.findOnePublished(slug);
  }
}
