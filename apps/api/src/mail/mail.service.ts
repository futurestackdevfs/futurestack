import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  private get fromAddress(): string {
    // Use Resend's shared test domain until you verify your own domain
    // with Resend for production sending.
    return (
      this.configService.get<string>('EMAIL_FROM') ??
      'FutureStack <onboarding@resend.dev>'
    );
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Reset your FutureStack password',
        html: `
          <p>We received a request to reset your FutureStack password.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } catch (error) {
      // Don't let an email-provider hiccup surface as a 500 to the user —
      // log it, but forgotPassword() still returns its generic success message.
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }
}
