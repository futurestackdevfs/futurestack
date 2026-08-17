import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentMailClient } from 'agentmail';

@Injectable()
export class MailService {
  private readonly client: AgentMailClient;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new AgentMailClient({
      apiKey: this.configService.get<string>('AGENTMAIL_API_KEY'),
    });
  }

  private get inboxId(): string {
    return (
      this.configService.get<string>('AGENTMAIL_INBOX_ID') ??
      'FutureStack <onboarding@agentmail.to>'
    );
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    try {
      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: 'Reset your FutureStack password',
        text: `We received a request to reset your FutureStack password.\n\nClick here to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
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