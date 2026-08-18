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

  private get frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    );
  }

  private fsShell(title: string, subtitle: string, bodyHtml: string): string {
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#ff6b00,#2563eb);padding:22px 28px;display:flex;align-items:center;gap:12px">
          <img src="${this.frontendUrl}/images/iconlogo.png" alt="FutureStack" width="42" height="42" style="border-radius:10px" />
          <div>
            <div style="color:#ffffff;font-size:19px;font-weight:bold">FutureStack Academy</div>
            <div style="color:rgba(255,255,255,.85);font-size:12.5px;margin-top:2px">${subtitle}</div>
          </div>
        </div>
        <div style="padding:28px">
          ${bodyHtml}
        </div>
        <div style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <div style="font-size:11px;color:#9ca3af;text-align:center;line-height:1.6">
            FutureStack Academy · learn · build · ship<br/>
            You received this email because a sale was recorded for your FutureStack account.<br/>
            Need help? Reply to this email and our team will assist you.
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Sent right after a sale is recorded but BEFORE payment is confirmed —
   * the order is UNDER PROCESSING. New students get their login credentials
   * + a course link to complete enrollment; existing students just get the
   * course link. Failures are logged, never thrown.
   */
  async sendSaleProcessingEmail(
    to: string,
    data: {
      studentName: string;
      courseName: string;
      courseLink: string;
      finalAmt: number;
      batchMode: string;
      isNewStudent: boolean;
      loginEmail: string;
      tempPassword: string | null;
    },
  ): Promise<void> {
    try {
      const credsHtml = data.isNewStudent
        ? `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px 20px;margin:0 0 22px">
            <div style="font-size:12px;font-weight:bold;color:#c2410c;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Your account is ready</div>
            <table style="border-collapse:collapse;font-size:14px">
              <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Login ID</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#111827">${data.loginEmail}</td></tr>
              <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Temporary password</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#ff6b00">${data.tempPassword}</td></tr>
            </table>
            <p style="font-size:13px;color:#9a3412;font-weight:600;margin:12px 0 0">⚠️ This password is valid for 10 minutes only — log in right away and set a new password.</p>
          </div>`
        : '';

      const text = [
        `Hi ${data.studentName},`,
        ``,
        `We've recorded your enrollment for ${data.courseName} at FutureStack.`,
        ``,
        `Course:  ${data.courseName}`,
        `Amount:  ₹${data.finalAmt.toLocaleString('en-IN')}`,
        `Batch:   ${data.batchMode}`,
        ``,
        `Payment status: UNDER PROCESSING — it will be confirmed shortly.`,
        data.isNewStudent
          ? `\nYour FutureStack account has been created:\nEmail: ${data.loginEmail}\nTemporary password: ${data.tempPassword}\n\n⚠️ This password is valid for 10 minutes only.\n\nLog in and complete your enrollment here: ${data.courseLink}`
          : `\nComplete your enrollment here: ${data.courseLink}`,
        ``,
        `— FutureStack Team`,
      ]
        .filter(Boolean)
        .join('\n');

      const html = this.fsShell(
        'Sale recorded',
        'Your payment is under processing',
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">Great news — your enrollment at <strong>FutureStack</strong> has been recorded. Your payment is currently <strong style="color:#c2410c">UNDER PROCESSING</strong> and will be confirmed shortly.</p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin:0 0 22px">
          <div style="font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Your enrollment</div>
          <table style="border-collapse:collapse;font-size:14px">
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Course</td><td style="padding:4px 0;font-weight:600;color:#111827">${data.courseName}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Amount</td><td style="padding:4px 0;font-weight:600;color:#111827">₹${data.finalAmt.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Batch mode</td><td style="padding:4px 0">${data.batchMode}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Payment status</td><td style="padding:4px 0"><span style="background:#fff7ed;color:#c2410c;font-weight:700;padding:2px 8px;border-radius:999px;font-size:12px">UNDER PROCESSING</span></td></tr>
          </table>
        </div>

        ${credsHtml}

        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 18px">Log in to FutureStack and open the course to get started:</p>
        <div style="text-align:center;margin:0 0 22px">
          <a href="${data.courseLink}" style="display:inline-block;background:linear-gradient(135deg,#ff6b00,#2563eb);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:10px">Open your course</a>
        </div>

        <p style="font-size:14px;color:#374151;margin:0">Happy learning!</p>
        <p style="font-size:14px;color:#374151;margin:0">— <strong>FutureStack Team</strong></p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Enrollment recorded for ${data.courseName} — payment pending 🕒`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send sale processing email to ${to}`, error);
    }
  }

  /**
   * Sent when a pending sale's payment is confirmed (order → PAID). Carries
   * the final receipt + course link. Failures are logged, never thrown.
   */
  async sendSaleConfirmedEmail(
    to: string,
    data: {
      studentName: string;
      courseName: string;
      courseLink: string;
      finalAmt: number;
      receiptNo: string;
      paymentMethod: string;
      batchMode: string;
    },
  ): Promise<void> {
    try {
      const text = [
        `Hi ${data.studentName},`,
        ``,
        `Your payment for ${data.courseName} has been confirmed! 🎉`,
        ``,
        `Course:         ${data.courseName}`,
        `Amount paid:    ₹${data.finalAmt.toLocaleString('en-IN')}`,
        `Receipt no:     ${data.receiptNo}`,
        `Payment method: ${data.paymentMethod}`,
        `Batch mode:     ${data.batchMode}`,
        ``,
        `Your receipt is available in your order history.`,
        `Open your course here: ${data.courseLink}`,
        ``,
        `Happy learning! — FutureStack Team`,
      ].join('\n');

      const html = this.fsShell(
        'Payment confirmed',
        'Your enrollment is complete 🎉',
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">Your payment has been confirmed — you're officially enrolled in <strong>${data.courseName}</strong>. 🎉</p>

        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px 20px;margin:0 0 22px">
          <div style="font-size:12px;font-weight:bold;color:#166534;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Payment receipt</div>
          <table style="border-collapse:collapse;font-size:14px">
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Receipt no</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#111827">${data.receiptNo}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Course</td><td style="padding:4px 0;font-weight:600;color:#111827">${data.courseName}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Amount paid</td><td style="padding:4px 0;font-weight:700;color:#166534">₹${data.finalAmt.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Payment method</td><td style="padding:4px 0">${data.paymentMethod}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Batch mode</td><td style="padding:4px 0">${data.batchMode}</td></tr>
          </table>
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 18px">Your receipt is saved in your <strong>order history</strong>. Jump into the course and start learning:</p>
        <div style="text-align:center;margin:0 0 22px">
          <a href="${data.courseLink}" style="display:inline-block;background:linear-gradient(135deg,#ff6b00,#2563eb);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:10px">Open your course</a>
        </div>

        <p style="font-size:14px;color:#374151;margin:0">Happy learning!</p>
        <p style="font-size:14px;color:#374151;margin:0">— <strong>FutureStack Team</strong></p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Payment confirmed — welcome to ${data.courseName} 🎉`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send sale confirmed email to ${to}`, error);
    }
  }

  /**
   * Sends staff credentials (login email + temporary password) to a new staff
   * member right after the admin creates their account. Failures are logged,
   * never thrown — a mail-provider hiccup must not fail the account creation.
   */
  async sendStaffCredentialsEmail(
    to: string,
    data: {
      name: string;
      role: string;
      loginEmail: string;
      tempPassword: string;
      loginUrl: string;
    },
  ): Promise<void> {
    try {
      const roleLabel = data.role
        .toLowerCase()
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const text = [
        `Hi ${data.name},`,
        ``,
        `Welcome to the FutureStack team! 🎉`,
        ``,
        `An account has been created for you as a ${roleLabel}. You can now sign in to the staff portal and start working.`,
        ``,
        `━━━ YOUR LOGIN DETAILS ━━━`,
        `Portal:   ${data.loginUrl}`,
        `Login ID: ${data.loginEmail}`,
        `Password: ${data.tempPassword}`,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `HOW TO SIGN IN`,
        `1. Open the portal link above.`,
        `2. Enter your Login ID and the temporary password.`,
        `3. On your first sign-in you'll be asked to set a new password of your own.`,
        ``,
        `SECURITY NOTES`,
        `• ⚠️ This temporary password is valid for 10 minutes only — sign in right away and set your own password.`,
        `• This is a restricted staff portal — keep your login details private.`,
        `• Do NOT share your password with anyone, including your manager.`,
        `• If you ever suspect your account has been compromised, reset your password right away.`,
        `• If you didn't expect this account, contact your admin immediately.`,
        ``,
        `Happy learning! — FutureStack Team`,
      ].join('\n');

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#ff6b00,#2563eb);padding:24px 28px">
            <div style="color:#ffffff;font-size:20px;font-weight:bold">FutureStack Academy</div>
            <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:4px">Staff Account — Welcome aboard</div>
          </div>
          <div style="padding:28px">
            <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.name}</strong>,</p>
            <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">Welcome to the <strong>FutureStack</strong> team! 🎉 An account has been created for you as a <strong>${roleLabel}</strong>. You can now sign in to the staff portal and get started.</p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin:0 0 22px">
              <div style="font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Your login details</div>
              <table style="border-collapse:collapse;font-size:14px">
                <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Staff Portal</td><td style="padding:4px 0;font-weight:600;color:#2563eb"><a href="${data.loginUrl}" style="color:#2563eb">${data.loginUrl}</a></td></tr>
                <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Login ID</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#111827">${data.loginEmail}</td></tr>
                <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Temporary password</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#ff6b00">${data.tempPassword}</td></tr>
              </table>
            </div>

            <div style="font-size:13px;font-weight:bold;color:#111827;margin-bottom:8px">How to sign in</div>
            <ol style="margin:0 0 22px;padding-left:20px;font-size:14px;color:#374151;line-height:1.7">
              <li>Open the staff portal link above.</li>
              <li>Enter your <strong>Login ID</strong> and the <strong>temporary password</strong>.</li>
              <li>On your first sign-in you'll be asked to set a new password of your own.</li>
            </ol>

            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;margin-bottom:22px">
              <div style="font-size:12px;font-weight:bold;color:#c2410c;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">⚠️ Important — please read</div>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#9a3412;line-height:1.7">
                <li><strong>⚠️ This temporary password is valid for 10 minutes only</strong> — sign in right away and set your own password.</li>
                <li>This is a <strong>restricted staff portal</strong> — keep your login details private.</li>
                <li>Never share your password with anyone, including your manager.</li>
                <li>If you ever suspect your account has been compromised, reset your password immediately.</li>
                <li>If you didn't expect this account, contact your admin right away.</li>
              </ul>
            </div>

            <p style="font-size:14px;color:#374151;margin:0 0 4px">Happy learning!</p>
            <p style="font-size:14px;color:#374151;margin:0">— <strong>FutureStack Team</strong></p>
          </div>
        </div>
      `;

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Welcome to FutureStack, ${data.name} — your login details`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send staff credentials email to ${to}`,
        error,
      );
    }
  }

  /**
   * Sends a freshly regenerated temporary password to a user. Used when an
   * admin regenerates the password from the staff detail view. Failures are
   * logged, never thrown.
   */
  async sendPasswordRegeneratedEmail(
    to: string,
    data: {
      name: string;
      loginEmail: string;
      tempPassword: string;
      loginUrl: string;
    },
  ): Promise<void> {
    try {
      const text = [
        `Hi ${data.name},`,
        ``,
        `Your FutureStack password has been regenerated by an admin.`,
        ``,
        `━━━ YOUR NEW PASSWORD ━━━`,
        `Login ID:     ${data.loginEmail}`,
        `New password: ${data.tempPassword}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `⚠️ This password is valid for 10 minutes only.`,
        `Sign in at ${data.loginUrl} right away, then set a new password of your own on first login.`,
        ``,
        `— FutureStack Team`,
      ].join('\n');

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#ff6b00,#2563eb);padding:24px 28px">
            <div style="color:#ffffff;font-size:20px;font-weight:bold">FutureStack Academy</div>
            <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:4px">Password Regenerated</div>
          </div>
          <div style="padding:28px">
            <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.name}</strong>,</p>
            <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">An admin has generated a new temporary password for your FutureStack account.</p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin:0 0 22px">
              <div style="font-size:12px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Your new password</div>
              <table style="border-collapse:collapse;font-size:14px">
                <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Login ID</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#111827">${data.loginEmail}</td></tr>
                <tr><td style="padding:4px 16px 4px 0;color:#6b7280">New password</td><td style="padding:4px 0;font-family:monospace;font-weight:700;color:#ff6b00">${data.tempPassword}</td></tr>
              </table>
            </div>

            <p style="font-size:13px;color:#b91c1c;font-weight:600;margin:0 0 8px">⚠️ This password is valid for 10 minutes only.</p>
            <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 22px">Sign in at <a href="${data.loginUrl}" style="color:#2563eb">${data.loginUrl}</a> right away, then set a new password of your own on first login.</p>

            <p style="font-size:14px;color:#374151;margin:0">— <strong>FutureStack Team</strong></p>
          </div>
        </div>
      `;

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: 'Your FutureStack password has been regenerated',
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send regenerated password email to ${to}`,
        error,
      );
    }
  }
}
