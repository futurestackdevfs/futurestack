import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { ArticleGenerator } from './pipeline/article-generator';
import { BlogGenerationService } from './pipeline/blog-generation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BlogController],
  providers: [BlogService, ArticleGenerator, BlogGenerationService],
})
export class BlogModule {}
