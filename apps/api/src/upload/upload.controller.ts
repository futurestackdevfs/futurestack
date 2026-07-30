import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { S3Service } from './s3.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Auth()
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|mp4|mov)$/i.test(file.originalname)) {
          return cb(new BadRequestException('File type not allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { url: null };

    let url: string;
    if (this.s3Service.isConfigured()) {
      url = await this.s3Service.uploadFile(file, 'uploads');
    } else {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + extname(file.originalname);
      const dir = join(__dirname, '../../public/uploads');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, filename), file.buffer);
      url = `/uploads/${filename}`;
    }

    return { url };
  }
}
