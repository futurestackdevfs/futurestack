import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VdoCipherService {
  private readonly logger = new Logger(VdoCipherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dev.vdocipher.com/api';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('VDOCIPHER_API_KEY') ?? '';
  }

  /**
   * Requests an upload slot from VdoCipher.
   * Returns the vdoCipherId (their videoId) and S3 upload credentials.
   * The actual video file is uploaded directly from the browser to S3
   * using these credentials — never through our server.
   */
  async getUploadCredentials(title: string): Promise<{
    vdoCipherId: string;
    uploadUrl: string;
    uploadCredentials: Record<string, string>;
  }> {
    const encodedTitle = encodeURIComponent(title);
    const response = await fetch(
      `${this.baseUrl}/videos?title=${encodedTitle}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Apisecret ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new InternalServerErrorException(
        `VdoCipher upload credentials request failed: ${response.status}`,
      );
    }

    const data = await response.json();
    
    // Log the raw response so we can verify the exact field name for uploadLink vs uploadUrl
    this.logger.log(`Raw VdoCipher credentials response: ${JSON.stringify(data)}`);

    return {
      vdoCipherId: data.videoId,
      // Defaulting to uploadLink but falling back to uploadUrl based on tier differences
      uploadUrl: data.clientPayload.uploadLink || data.clientPayload.uploadUrl,
      uploadCredentials: {
        key: data.clientPayload.key,
        policy: data.clientPayload.policy,
        'x-amz-signature': data.clientPayload['x-amz-signature'],
        'x-amz-algorithm': data.clientPayload['x-amz-algorithm'],
        'x-amz-date': data.clientPayload['x-amz-date'],
        'x-amz-credential': data.clientPayload['x-amz-credential'],
        // VdoCipher's policy still requires these fields even when their API
        // no longer returns them in clientPayload. Defaults keep S3 happy.
        success_action_status: data.clientPayload.success_action_status ?? '201',
        success_action_redirect: data.clientPayload.success_action_redirect ?? '',
      },
    };
  }

  /**
   * Generates a playback OTP for a specific video.
   * The OTP is valid for ~5 minutes and single-use.
   * Pass the student's name and email to embed as a visible watermark.
   */
  async getPlaybackOtp(
    vdoCipherId: string,
    watermark: { name: string; email: string },
  ): Promise<{ otp: string; playbackInfo: string }> {
    const response = await fetch(
      `${this.baseUrl}/videos/${vdoCipherId}/otp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Apisecret ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          annotate: JSON.stringify([
            {
              type: 'text',
              text: `${watermark.name} · ${watermark.email}`,
              alpha: '0.6',
              color: '0xFF0000',
              size: '14',
              interval: '5000',
              x: '10',    // ADD THIS — x position (percentage from left)
              y: '10',    // ADD THIS — y position (percentage from top)
            },
          ]),
          ttl: 300,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VdoCipher OTP error body: ${errorBody}`);
      throw new InternalServerErrorException(
        `VdoCipher OTP request failed: ${response.status} — ${errorBody}`,
      );
    }

    const data = await response.json();
    return { otp: data.otp, playbackInfo: data.playbackInfo };
  }
}
