import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const s3Url = this.configService.get<string>('SUPABASE_URL');
    // NOTE: Supabase S3 typically requires an Access Key and a Secret Key.
    // If you only have one key in .env, you may need to update it to have both.
    const accessKeyId = this.configService.get<string>('SUPABASE_ACCESS_KEY') || this.configService.get<string>('SUPABASE_KEY');
    const secretAccessKey = this.configService.get<string>('SUPABASE_SECRET_KEY') || this.configService.get<string>('SUPABASE_KEY');
    const region = this.configService.get<string>('SUPABASE_REGION') || 'ap-south-1';
    
    this.bucket = this.configService.get<string>('SUPABASE_BUCKET') || '';
    // Extract domain from URL to build public URL (e.g. https://<project>.supabase.co/storage/v1/object/public/<bucket>)
    if (s3Url) {
      const match = s3Url.match(/(https:\/\/[^.]+)\.storage\.supabase\.co/);
      if (match) {
        this.publicUrl = `${match[1]}.supabase.co/storage/v1/object/public/${this.bucket}`;
      } else {
        // Fallback for standard Supabase URL if it's already https://<project>.supabase.co
        this.publicUrl = `${s3Url.replace(/\/storage\/v1\/s3$/, '')}/storage/v1/object/public/${this.bucket}`;
      }
    }

    if (s3Url && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        forcePathStyle: true,
        region,
        endpoint: s3Url,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('S3 Storage is not properly configured');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + extname(file.originalname);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
      
      // Return the public URL for the uploaded file
      return `${this.publicUrl}/${filename}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }
}
