import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { S3Service, S3Folder } from './s3.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  private async processUpload(file: Express.Multer.File, folder: S3Folder) {
    if (!file) return { url: null };
    return { url: await this.s3Service.uploadFile(file, folder) };
  }

  // Discussion uploads: Students & Trainers. Only images. Max 5MB.
  @Auth()
  @Post('discussion')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) {
          return cb(
            new BadRequestException(
              'Only image files are allowed for discussions',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadDiscussionImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.processUpload(file, 'discussions');
  }

  // Course & banner image uploads: Admins & Content Managers. Images only.
  // The ?folder= query (courses | banners) decides the storage location — the
  // generic /upload/resource endpoint no longer needs to accept these.
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) {
          return cb(
            new BadRequestException(
              'Only image files are allowed (jpg, jpeg, png, webp, gif)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(
    @Query('folder') folder: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const safeFolder: S3Folder =
      folder === 'banners' ? 'banners' : folder === 'courses' ? 'courses' : folder === 'projects' ? 'projects' : 'courses';
    return this.processUpload(file, safeFolder);
  }

  // Course Resource uploads: Admins & Content Managers. Any resource type. Max 50MB.
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('resource')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (
          !/\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|zip|rar|mp4|mov)$/i.test(
            file.originalname,
          )
        ) {
          return cb(
            new BadRequestException('File type not allowed for resources'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async uploadCourseResource(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.processUpload(file, 'resources');
  }
}
