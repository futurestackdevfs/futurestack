import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class VdoCipherWebhookPayload {
  @IsString()
  @IsOptional()
  hookId?: string;

  @IsNumber()
  @IsOptional()
  time?: number;

  @IsString()
  @IsIn(['video:ready', 'video:updated', 'video:deleted', 'video:error', 'caption:ready', 'caption:deleted', 'poster:ready'])
  event: string;

  @IsOptional()
  payload: {
    id: string;
    title?: string;
    length?: number;
    status?: string;
    error?: string;
    captionId?: number;
    language?: string;
    posterUrl?: string;
  };
}
