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
      'Future Stack <onboarding@agentmail.to>'
    );
  }

  /** The plain email address of the one configured inbox — everything (staff
   * notifications, R&D inquiries, etc.) sends to this address only. */
  getPrimaryInboxAddress(): string {
    return this.inboxId.replace(/^.*<([^>]+)>.*$/, '$1');
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    try {
      const text = [
        `We received a request to reset your Future Stack password.`,
        ``,
        `Reset it here: ${resetUrl}`,
        ``,
        `This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will stay the same.`,
        ``,
        `— Future Stack Support`,
      ].join('\n');

      const html = this.fsShell(
        'Reset your password',
        'Account security',
        `
        <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">We received a request to reset the password for your Future Stack account.</p>
        ${this.button('Reset my password', resetUrl)}
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.7;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;color:#2563eb;">${resetUrl}</span></p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: 'Reset your Future Stack password',
        text,
        html,
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

  /**
   * Absolute, public HTTPS URL of the brand logo used in every email header.
   * Email clients can't load `localhost` or private URLs, so in dev/staging
   * you must point MAIL_LOGO_URL at a publicly hosted copy (e.g. the Supabase
   * public bucket). Falls back to the frontend's /images/logo.png.
   */
  private get logoUrl(): string {
    const explicit = this.configService.get<string>('MAIL_LOGO_URL')?.trim();
    if (explicit) return explicit;
    const s3Public = this.configService.get<string>('S3_PUBLIC_URL')?.trim();
    if (s3Public) return `${s3Public.replace(/\/+$/, '')}/brand/email-logo.png`;
    return `${this.frontendUrl}/images/logo.png`;
  }

  /** Table-based CTA button — renders reliably in every email client. */
  private button(label: string, url: string): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;">
        <tr><td style="border-radius:10px;background:linear-gradient(135deg,#ff6b00,#2563eb);">
          <a href="${url}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
        </td></tr>
      </table>`;
  }

  /**
   * Shared branded email wrapper. Table-based (not flexbox) so it renders
   * consistently across Gmail, Outlook, Apple Mail, etc. `title` shows as the
   * email heading; `subtitle` is the small line under the logo in the header.
   */
  private fsShell(title: string, subtitle: string, bodyHtml: string): string {
    const year = new Date().getFullYear();
    return `
<div style="margin:0;padding:0;background:#f1f3f8;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title} — Future Stack</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;font-family:'Segoe UI',Roboto,Arial,Helvetica,sans-serif;">
        <!-- header -->
        <tr><td style="padding:24px 30px 18px;background:#ffffff;">
          <a href="${this.frontendUrl}" style="text-decoration:none;">
            <img src="${this.logoUrl}" alt="FutureStack" height="40" style="display:block;height:40px;width:auto;max-width:200px;border:0;outline:none;" />
          </a>
          <div style="color:#64748b;font-size:11.5px;margin-top:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">${subtitle}</div>
        </td></tr>
        <tr><td style="height:3px;background:linear-gradient(90deg,#ff6b00,#2563eb);font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- body -->
        <tr><td style="padding:30px 32px 26px;">
          <h1 style="margin:0 0 18px;font-size:19px;font-weight:700;color:#0f172a;line-height:1.35;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 6px;font-size:12px;color:#475569;line-height:1.6;">
            Need help? Just reply to this email — our support team will get back to you.
          </p>
          <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
            © ${year} Future Stack · Think. Create. Conquer.<br/>
            This is an automated message from Future Stack. Please do not share the contents of this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
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
        `We've recorded your enrollment for ${data.courseName} at Future Stack.`,
        ``,
        `Course:  ${data.courseName}`,
        `Amount:  ₹${data.finalAmt.toLocaleString('en-IN')}`,
        `Batch:   ${data.batchMode}`,
        ``,
        `Payment status: UNDER PROCESSING — it will be confirmed shortly.`,
        data.isNewStudent
          ? `\nYour Future Stack account has been created:\nEmail: ${data.loginEmail}\nTemporary password: ${data.tempPassword}\n\n⚠️ This password is valid for 10 minutes only.\n\nLog in and complete your enrollment here: ${data.courseLink}`
          : `\nComplete your enrollment here: ${data.courseLink}`,
        ``,
        `— Future Stack team`,
      ]
        .filter(Boolean)
        .join('\n');

      const html = this.fsShell(
        'Sale recorded',
        'Your payment is under processing',
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">Great news — your enrollment at <strong>Future Stack</strong> has been recorded. Your payment is currently <strong style="color:#c2410c">UNDER PROCESSING</strong> and will be confirmed shortly.</p>

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

        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 18px">Log in to Future Stack and open the course to get started:</p>
        <div style="text-align:center;margin:0 0 22px">
          <a href="${data.courseLink}" style="display:inline-block;background:linear-gradient(135deg,#ff6b00,#2563eb);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:10px">Open your course</a>
        </div>

        <p style="font-size:14px;color:#374151;margin:0">Happy learning!</p>
        <p style="font-size:14px;color:#374151;margin:0">— <strong>Future Stack team</strong></p>
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
        `Happy learning! — Future Stack team`,
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
        <p style="font-size:14px;color:#374151;margin:0">— <strong>Future Stack team</strong></p>
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
        `Welcome to the Future Stack team! 🎉`,
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
        `Happy learning! — Future Stack team`,
      ].join('\n');

      const html = this.fsShell(
        'Your staff account is ready',
        `Staff portal · ${roleLabel}`,
        `
        <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7;">Hi <strong>${data.name}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">Welcome to the Future Stack team. An account has been created for you as a <strong>${roleLabel}</strong> — here are your sign-in details.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin:0 0 22px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Your login details</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
              <tr><td style="padding:3px 16px 3px 0;color:#64748b;">Staff portal</td><td style="padding:3px 0;"><a href="${data.loginUrl}" style="color:#2563eb;">${data.loginUrl}</a></td></tr>
              <tr><td style="padding:3px 16px 3px 0;color:#64748b;">Login ID</td><td style="padding:3px 0;font-family:'Courier New',monospace;font-weight:700;color:#0f172a;">${data.loginEmail}</td></tr>
              <tr><td style="padding:3px 16px 3px 0;color:#64748b;">Temporary password</td><td style="padding:3px 0;font-family:'Courier New',monospace;font-weight:700;color:#ff6b00;">${data.tempPassword}</td></tr>
            </table>
          </td></tr>
        </table>

        ${this.button('Sign in to the staff portal', data.loginUrl)}

        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;">How to sign in</p>
        <ol style="margin:0 0 20px;padding-left:20px;font-size:13.5px;color:#334155;line-height:1.7;">
          <li>Open the staff portal link above.</li>
          <li>Enter your Login ID and the temporary password.</li>
          <li>You'll be asked to set your own password on first sign-in.</li>
        </ol>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin:0 0 20px;">
          <tr><td style="padding:14px 18px;">
            <div style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Important</div>
            <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#9a3412;line-height:1.7;">
              <li>This temporary password is valid for <strong>10 minutes only</strong> — sign in right away.</li>
              <li>Keep your login details private and never share your password.</li>
              <li>If you suspect your account is compromised, reset your password immediately.</li>
              <li>If you weren't expecting this account, contact your admin.</li>
            </ul>
          </td></tr>
        </table>

        <p style="margin:0;font-size:14px;color:#334155;">— The Future Stack team</p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Welcome to Future Stack, ${data.name} — your login details`,
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
        `Your Future Stack password has been regenerated by an admin.`,
        ``,
        `━━━ YOUR NEW PASSWORD ━━━`,
        `Login ID:     ${data.loginEmail}`,
        `New password: ${data.tempPassword}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `⚠️ This password is valid for 10 minutes only.`,
        `Sign in at ${data.loginUrl} right away, then set a new password of your own on first login.`,
        ``,
        `— Future Stack team`,
      ].join('\n');

      const html = this.fsShell(
        'Your password has been reset',
        'Account security',
        `
        <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7;">Hi <strong>${data.name}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.7;">An admin has generated a new temporary password for your Future Stack account.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin:0 0 20px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Your new password</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
              <tr><td style="padding:3px 16px 3px 0;color:#64748b;">Login ID</td><td style="padding:3px 0;font-family:'Courier New',monospace;font-weight:700;color:#0f172a;">${data.loginEmail}</td></tr>
              <tr><td style="padding:3px 16px 3px 0;color:#64748b;">New password</td><td style="padding:3px 0;font-family:'Courier New',monospace;font-weight:700;color:#ff6b00;">${data.tempPassword}</td></tr>
            </table>
          </td></tr>
        </table>

        ${this.button('Sign in now', data.loginUrl)}

        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b91c1c;">This password is valid for 10 minutes only.</p>
        <p style="margin:0 0 20px;font-size:13.5px;color:#334155;line-height:1.7;">Sign in right away, then set a new password of your own on first login. If you didn't expect this, contact your admin immediately.</p>

        <p style="margin:0;font-size:14px;color:#334155;">— Future Stack Support</p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: 'Your Future Stack password has been regenerated',
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

  /**
   * Sent when a refund has been processed for a student. Includes the refund
   * amount and order reference. Failures are logged, never thrown.
   */
  async sendRefundProcessedEmail(
    to: string,
    data: {
      studentName: string;
      courseName: string;
      refundAmount: number;
      orderId: string;
    },
  ): Promise<void> {
    try {
      const text = [
        `Hi ${data.studentName},`,
        ``,
        `Your refund has been processed.`,
        ``,
        `Course:       ${data.courseName}`,
        `Refund amount: ₹${data.refundAmount.toLocaleString('en-IN')}`,
        `Order ID:     ${data.orderId}`,
        ``,
        `The refund will be credited to your original payment method within 5-7 business days.`,
        ``,
        `If you have any questions, reply to this email.`,
        ``,
        `— Future Stack team`,
      ].join('\n');

      const html = this.fsShell(
        'Your refund has been processed',
        'Your refund has been initiated',
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">Your refund for <strong>${data.courseName}</strong> has been processed successfully.</p>

        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px 20px;margin:0 0 22px">
          <div style="font-size:12px;font-weight:bold;color:#166534;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Refund Details</div>
          <table style="border-collapse:collapse;font-size:14px">
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Course</td><td style="padding:4px 0;font-weight:600;color:#111827">${data.courseName}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Refund amount</td><td style="padding:4px 0;font-weight:700;color:#166534">₹${data.refundAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Order ID</td><td style="padding:4px 0;font-family:monospace;font-size:12px;color:#111827">${data.orderId}</td></tr>
          </table>
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 18px">The refund will be credited to your original payment method within <strong>5-7 business days</strong>.</p>

        <p style="font-size:14px;color:#374151;margin:0">If you have any questions, reply to this email.</p>
        <p style="font-size:14px;color:#374151;margin:0">— <strong>Future Stack team</strong></p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Refund processed for ${data.courseName} — ₹${data.refundAmount.toLocaleString('en-IN')}`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send refund processed email to ${to}`,
        error,
      );
    }
  }

  // ─── Support tickets ─────────────────────────────────────────────

  private ticketButton(label: string, url: string): string {
    return this.button(label, url);
  }

  async sendTicketOpenedEmail(
    to: string,
    data: {
      studentName: string;
      ticketRef: string;
      subject: string;
      url: string;
    },
  ): Promise<void> {
    try {
      const shortId = data.ticketRef;
      const text = [
        `Hi ${data.studentName},`,
        ``,
        `We've received your support request and our team will get back to you soon.`,
        ``,
        `Ticket:  ${shortId}`,
        `Subject: ${data.subject}`,
        ``,
        `Track it or add more details here: ${data.url}`,
        ``,
        `— Future Stack Support`,
      ].join('\n');

      const html = this.fsShell(
        'Support ticket created',
        `Ticket ${shortId}`,
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">We've received your support request. Our team will review it and reply as soon as possible — you'll get an email when there's an update.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin:0 0 22px">
          <table style="border-collapse:collapse;font-size:14px">
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Ticket</td><td style="padding:4px 0;font-family:monospace;color:#111827">${shortId}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Subject</td><td style="padding:4px 0;font-weight:600;color:#111827">${data.subject}</td></tr>
          </table>
        </div>
        ${this.ticketButton('View ticket', data.url)}
        <p style="font-size:13px;color:#6b7280;margin:0">You can add screenshots or more details any time from that page.</p>
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `We've got your request — ticket ${shortId}`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send ticket-opened email to ${to}`, error);
    }
  }

  async sendTicketReplyEmail(
    to: string,
    data: {
      studentName: string;
      subject: string;
      preview: string;
      url: string;
    },
  ): Promise<void> {
    try {
      const text = [
        `Hi ${data.studentName},`,
        ``,
        `Support has replied to your ticket "${data.subject}":`,
        ``,
        `"${data.preview}"`,
        ``,
        `Read the full reply and respond here: ${data.url}`,
        ``,
        `— Future Stack Support`,
      ].join('\n');

      const html = this.fsShell(
        'New reply on your ticket',
        data.subject,
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px">Our support team has replied to your ticket <strong>"${data.subject}"</strong>.</p>
        <div style="background:#f9fafb;border-left:3px solid #2563eb;border-radius:8px;padding:14px 18px;margin:0 0 22px;font-size:14px;color:#374151;line-height:1.6">${data.preview}${data.preview.length >= 240 ? '…' : ''}</div>
        ${this.ticketButton('Read & reply', data.url)}
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Re: ${data.subject} — support replied`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send ticket-reply email to ${to}`, error);
    }
  }

  async sendTicketResolvedEmail(
    to: string,
    data: { studentName: string; subject: string; url: string },
  ): Promise<void> {
    try {
      const text = [
        `Hi ${data.studentName},`,
        ``,
        `Your support ticket "${data.subject}" has been marked as resolved.`,
        ``,
        `If your issue isn't fully sorted, just reply on the ticket and it will re-open: ${data.url}`,
        ``,
        `— Future Stack Support`,
      ].join('\n');

      const html = this.fsShell(
        'Ticket resolved',
        data.subject,
        `
        <p style="font-size:16px;color:#111827;margin:0 0 6px">Hi <strong>${data.studentName}</strong>,</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">Your ticket <strong>"${data.subject}"</strong> has been marked as <strong style="color:#166534">resolved</strong>.</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">If something is still not right, reply on the ticket and it will re-open automatically.</p>
        ${this.ticketButton('View ticket', data.url)}
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `Resolved: ${data.subject}`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send ticket-resolved email to ${to}`, error);
    }
  }

  async sendAgentNewTicketEmail(
    to: string,
    data: { subject: string; category: string; priority: string; url: string },
  ): Promise<void> {
    try {
      const text = [
        `New support ticket`,
        ``,
        `Subject:  ${data.subject}`,
        `Category: ${data.category}`,
        `Priority: ${data.priority}`,
        ``,
        `Open in the support console: ${data.url}`,
      ].join('\n');

      const html = this.fsShell(
        'New support ticket',
        `${data.category} · ${data.priority}`,
        `
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px">A new support ticket needs attention.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin:0 0 22px">
          <table style="border-collapse:collapse;font-size:14px">
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Subject</td><td style="padding:4px 0;font-weight:600;color:#111827">${data.subject}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Category</td><td style="padding:4px 0;color:#111827">${data.category}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Priority</td><td style="padding:4px 0;color:#111827">${data.priority}</td></tr>
          </table>
        </div>
        ${this.ticketButton('Open in console', data.url)}
      `,
      );

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        subject: `[Support] ${data.priority} · ${data.subject}`,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send agent new-ticket email to ${to}`,
        error,
      );
    }
  }

  /**
   * "Have an R&D problem worth solving?" form on /research-and-development.
   * Notifies `CONTACT_EMAIL` if set, else the primary inbox (same routing as the
   * generic Contact form). `replyTo` is the visitor's own email, so hitting
   * "reply" goes straight to them.
   */
  async sendRndInquiryEmail(data: {
    fromEmail: string;
    details?: string;
  }): Promise<boolean> {
    const to =
      this.configService.get<string>('CONTACT_EMAIL')?.trim() ||
      this.getPrimaryInboxAddress();

    try {
      const detailsHtml = data.details
        ? `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${this.escapeHtml(data.details)}</p>`
        : `<p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">No additional details were added.</p>`;

      const html = this.fsShell(
        'New R&D lab inquiry',
        'Research & Development · Contact form',
        `
        <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">Someone on the <strong>Research &amp; Development</strong> page asked to start a conversation.</p>
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">From</p>
        <p style="margin:0 0 16px;font-size:14px;color:#0f172a;font-weight:600;">${this.escapeHtml(data.fromEmail)}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Additional details</p>
        ${detailsHtml}
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">Reply to this email to answer them directly.</p>
      `,
      );

      const text = [
        'New R&D lab inquiry — Research & Development page',
        '',
        `From: ${data.fromEmail}`,
        '',
        'Additional details:',
        data.details?.trim() || '(none provided)',
      ].join('\n');

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        // The From address can never be the visitor's own — AgentMail (like
        // any provider) only lets you send from a verified inbox you own,
        // to stop spoofing. The visitor's identity travels in the subject,
        // the body, and replyTo (so hitting "reply" reaches them directly).
        replyTo: [data.fromEmail],
        subject: `[R&D Inquiry] ${data.fromEmail}`,
        text,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send R&D inquiry email (from ${data.fromEmail})`,
        error,
      );
      return false;
    }
  }

  /**
   * Generic "Contact us" form (business / trainer / other inquiries from
   * non-students). Notifies `CONTACT_EMAIL` if set, else the primary inbox.
   * `replyTo` is the visitor's own email so hitting "reply" reaches them — the
   * From address can never be the visitor's (provider anti-spoofing), so their
   * identity lives in the subject + body.
   */
  async sendContactEmail(data: {
    name: string;
    email: string;
    phone?: string;
    type: 'business' | 'trainer' | 'other';
    company?: string;
    message: string;
  }): Promise<boolean> {
    const to =
      this.configService.get<string>('CONTACT_EMAIL')?.trim() ||
      this.getPrimaryInboxAddress();

    const typeLabel =
      data.type === 'business'
        ? 'Business'
        : data.type === 'trainer'
          ? 'Trainer'
          : 'General';

    try {
      const row = (label: string, value?: string) =>
        value
          ? `<tr><td style="padding:4px 16px 4px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;">${label}</td><td style="padding:4px 0;font-size:14px;color:#0f172a;">${this.escapeHtml(value)}</td></tr>`
          : '';

      const html = this.fsShell(
        'New contact inquiry',
        `Contact form · ${typeLabel}`,
        `
        <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">Someone reached out through the <strong>Contact</strong> form.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
          ${row('Name', data.name)}
          ${row('Email', data.email)}
          ${row('Phone', data.phone)}
          ${row('Reaching out as', typeLabel)}
          ${row('Company', data.company)}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Message</p>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${this.escapeHtml(data.message)}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">Reply to this email to answer them directly.</p>
      `,
      );

      const text = [
        `New contact inquiry — ${typeLabel}`,
        '',
        `Name:    ${data.name}`,
        `Email:   ${data.email}`,
        data.phone ? `Phone:   ${data.phone}` : '',
        data.company ? `Company: ${data.company}` : '',
        '',
        'Message:',
        data.message,
      ]
        .filter(Boolean)
        .join('\n');

      await this.client.inboxes.messages.send(this.inboxId, {
        to,
        replyTo: [data.email],
        subject: `[Contact · ${typeLabel}] ${data.name} <${data.email}>`,
        text,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send contact email (from ${data.email})`,
        error,
      );
      return false;
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Raw inbox reading — every real message in the support inbox, not just
  // ── ones tied to a SupportTicket (e.g. the R&D contact form, or anything
  // ── that lands here without going through the ticket system). ─────────

  // AgentMail addresses are plain strings — `user@domain.com` or
  // `Display Name <user@domain.com>` — never objects. Parse into a shape
  // the frontend can render without guessing.
  private parseAddress(raw: string): { email: string; displayName?: string } {
    const match = raw.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
    if (match) {
      const name = match[1].replace(/^["']|["']$/g, '').trim();
      return name
        ? { email: match[2], displayName: name }
        : { email: match[2] };
    }
    return { email: raw.trim() };
  }

  async listInboxThreads(opts: {
    q?: string;
    limit: number;
    pageToken?: string;
  }) {
    const inboxId = this.inboxId;
    const body = opts.q?.trim()
      ? await this.client.inboxes.threads.search(inboxId, {
          q: opts.q.trim(),
          limit: opts.limit,
        })
      : await this.client.inboxes.threads.list(inboxId, {
          limit: opts.limit,
          pageToken: opts.pageToken,
        });
    return {
      threads: (body.threads ?? []).map((t) => ({
        id: t.threadId,
        subject: t.subject ?? '(no subject)',
        preview: t.preview ?? '',
        senders: (t.senders ?? []).map((s) => this.parseAddress(s)),
        recipients: (t.recipients ?? []).map((r) => this.parseAddress(r)),
        unread: (t.labels ?? []).includes('unread'),
        messageCount: t.messageCount,
        lastMessageId: t.lastMessageId,
        updatedAt: t.updatedAt,
        createdAt: t.createdAt,
      })),
      nextPageToken: 'nextPageToken' in body ? body.nextPageToken : undefined,
    };
  }

  async getInboxThread(threadId: string) {
    const t = await this.client.inboxes.threads.get(this.inboxId, threadId);
    return {
      id: t.threadId,
      subject: t.subject ?? '(no subject)',
      messages: t.messages.map((m) => ({
        id: m.messageId,
        from: this.parseAddress(m.from),
        to: (m.to ?? []).map((a) => this.parseAddress(a)),
        cc: (m.cc ?? []).map((a) => this.parseAddress(a)),
        subject: m.subject,
        text: m.text ?? m.extractedText ?? null,
        html: m.html ?? null,
        attachments: m.attachments ?? [],
        createdAt: m.createdAt,
      })),
    };
  }

  async replyInInboxThread(threadId: string, body: string) {
    const thread = await this.client.inboxes.threads.get(
      this.inboxId,
      threadId,
    );
    const lastMessageId = thread.lastMessageId;
    await this.client.inboxes.messages.reply(this.inboxId, lastMessageId, {
      text: body,
    });
  }
}
