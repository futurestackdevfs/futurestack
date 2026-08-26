import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { extname } from 'path';

export type S3Folder =
  | 'avatars'
  | 'uploads'
  | 'courses'
  | 'banners'
  | 'discussions'
  | 'resources'
  | 'projects';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private bucket = '';
  private publicUrl = '';
  private configured = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const region =
      this.config.get<string>('AWS_REGION') ||
      this.config.get<string>('SUPABASE_REGION') ||
      'ap-south-1';
    const accessKey =
      this.config.get<string>('AWS_ACCESS_KEY_ID') ||
      this.config.get<string>('SUPABASE_ACCESS_KEY');
    const secretKey =
      this.config.get<string>('AWS_SECRET_ACCESS_KEY') ||
      this.config.get<string>('SUPABASE_SECRET_KEY');
    const bucket =
      this.config.get<string>('S3_BUCKET') ||
      this.config.get<string>('SUPABASE_BUCKET');
    const endpoint =
      this.config.get<string>('S3_ENDPOINT') ||
      this.config.get<string>('SUPABASE_URL');

    if (!accessKey || !secretKey || !bucket) {
      this.logger.warn(
        'S3 not configured — falling back to local disk storage',
      );
      return;
    }

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    this.bucket = bucket;
    this.publicUrl =
      this.config.get<string>('S3_PUBLIC_URL') ??
      `https://${bucket}.s3.${region}.amazonaws.com`;
    this.configured = true;
    this.logger.log(`S3 initialised — bucket: ${bucket}, region: ${region}`);
  }

  private ensureConfigured(): void {
    if (!this.configured || !this.client) {
      throw new Error(
        'S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET.',
      );
    }
  }

  /** Generate a unique filename preserving the original extension */
  private generateKey(folder: S3Folder, originalname: string): string {
    const ext = extname(originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `${folder}/${unique}${ext}`;
  }

  /** Extract the S3 key from a full URL (to use with delete) */
  static keyFromUrl(url: string): string | null {
    if (!url) return null;
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/^\//, '');
      // Handle Supabase URLs: storage/v1/object/public/{bucket}/{key} → {key}
      const supabaseMatch = path.match(
        /^storage\/v1\/object\/public\/[^/]+\/(.+)/,
      );
      if (supabaseMatch) return supabaseMatch[1];
      return path;
    } catch {
      return null;
    }
  }

  /**
   * Upload a buffer to S3.
   * @returns The public URL of the uploaded file.
   */
  async upload(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    folder: S3Folder,
  ): Promise<string> {
    this.ensureConfigured();

    const key = this.generateKey(folder, originalname);
    const start = performance.now();

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    const elapsed = Math.round(performance.now() - start);
    this.logger.log(`Uploaded to S3: ${key} +${elapsed}ms`);
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Upload a file using Express.Multer.File (convenience wrapper).
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: S3Folder,
  ): Promise<string> {
    return this.upload(file.buffer, file.originalname, file.mimetype, folder);
  }

  /**
   * Delete a file from S3 by its full URL.
   */
  async deleteByUrl(url: string): Promise<void> {
    const key = S3Service.keyFromUrl(url);
    if (!key) return;
    await this.delete(key);
  }

  /**
   * Delete a file from S3 by its key (path within bucket).
   */
  async delete(key: string): Promise<void> {
    this.ensureConfigured();
    try {
      await this.client!.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted from S3: ${key}`);
    } catch (err) {
      this.logger.warn(`Failed to delete ${key} from S3: ${err}`);
    }
  }

  /**
   * Check whether S3 is active (env vars present).
   * When false, controllers can fall back to local disk.
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /** Return the configured public URL base */
  getPublicUrl(): string {
    return this.publicUrl;
  }
}
