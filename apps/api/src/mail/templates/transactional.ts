import {
  EmailContext,
  EmailSpec,
  Row,
  formatDate,
  formatDateTime,
  formatMoney,
} from './render';

type Currency = 'INR' | 'USD';

/** First name for greetings — "Ram Warhekar" → "Ram". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

// ─── 1. Order confirmation (online payment succeeded) ───────────────

export interface OrderConfirmationData {
  name: string;
  orderRef: string;
  invoiceNumber?: string | null;
  paidAt: Date;
  items: { name: string; kind: 'course' | 'project'; amount: number }[];
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  gstPercent: number;
  gst: number;
  total: number;
  currency: Currency;
  paymentMethod?: string | null;
}

export function orderConfirmationEmail(ctx: EmailContext, d: OrderConfirmationData): EmailSpec {
  const money = (n: number) => formatMoney(n, d.currency);
  const first = d.items[0]?.name ?? 'your order';
  const more = d.items.length - 1;
  const hasProject = d.items.some((i) => i.kind === 'project');
  const hasCourse = d.items.some((i) => i.kind === 'course');

  const totals: Row[] = [{ label: 'Subtotal', value: money(d.subtotal) }];
  if (d.discount > 0) {
    totals.push({
      label: d.couponCode ? `Discount (${d.couponCode})` : 'Discount',
      value: `− ${money(d.discount)}`,
    });
  }
  if (d.gstPercent > 0) totals.push({ label: `GST (${d.gstPercent}%)`, value: money(d.gst) });
  totals.push({ label: 'Total paid', value: money(d.total), strong: true });

  const details: Row[] = [
    { label: 'Order', value: d.orderRef, mono: true },
    ...(d.invoiceNumber ? [{ label: 'Invoice', value: d.invoiceNumber, mono: true }] : []),
    { label: 'Date', value: formatDateTime(d.paidAt) },
    ...(d.paymentMethod ? [{ label: 'Paid with', value: d.paymentMethod }] : []),
  ];

  return {
    subject: `Payment received — ${money(d.total)} for ${first}${more > 0 ? ` +${more} more` : ''}`,
    preheader: `Your order ${d.orderRef} is confirmed and your learning is unlocked.`,
    eyebrow: 'Order confirmation',
    tone: 'success',
    icon: '✅',
    title: 'Payment received — you’re in!',
    intro: `Hi ${firstName(d.name)}, thank you for your purchase. Your ${plural(d.items.length, 'item is', 'items are')} unlocked and ready whenever you are.`,
    blocks: [
      {
        type: 'items',
        items: d.items.map((i) => ({
          name: i.name,
          sub: i.kind === 'project' ? 'Live project' : 'Course',
          amount: money(i.amount),
        })),
        totals,
      },
      { type: 'card', title: 'Order details', rows: details, tone: 'info' },
      {
        type: 'steps',
        title: 'What happens next',
        steps: [
          hasCourse
            ? 'Open My Courses and start the first lesson — your progress is saved automatically.'
            : 'Open My Projects to begin your project.',
          hasProject && hasCourse
            ? 'Your project is under My Projects, next to your courses.'
            : 'Finish all lessons and quizzes to earn your verified certificate.',
          'Stuck anywhere? Ask in the course discussion or raise a support ticket.',
        ],
      },
    ],
    cta: { label: hasCourse ? 'Start learning' : 'Open my project', url: `${ctx.siteUrl}/my-dashboard?tab=${hasCourse ? 'courses' : 'projects'}` },
    secondaryLink: { label: 'View order & download invoice', url: `${ctx.siteUrl}/order-history` },
  };
}

// ─── 2. Welcome + verify email ──────────────────────────────────────

export interface WelcomeData {
  name: string;
  /** Present for email/password signups; absent when the email is already verified (Google). */
  verifyUrl?: string;
}

export function welcomeEmail(ctx: EmailContext, d: WelcomeData): EmailSpec {
  const verify = !!d.verifyUrl;
  return {
    subject: verify ? 'Welcome to FutureStack — please confirm your email' : 'Welcome to FutureStack',
    preheader: verify
      ? 'One quick step: confirm your email so you can pay, get invoices and reset your password.'
      : 'Your account is ready. Pick a course and start building.',
    eyebrow: 'Welcome',
    tone: 'brand',
    icon: '👋',
    title: `Welcome to FutureStack, ${firstName(d.name)}!`,
    intro: verify
      ? 'Your account is ready. Please confirm your email address so we can send your invoices and keep your account safe.'
      : 'Your account is ready. Pick a course and start building real-world skills.',
    blocks: [
      {
        type: 'steps',
        title: 'Getting started',
        steps: [
          'Browse the course catalog and pick a path that fits your goal.',
          'Learn with hands-on projects and mentor-led lessons.',
          'Earn a verified certificate you can share on LinkedIn.',
        ],
      },
      ...(verify
        ? [{ type: 'note' as const, tone: 'info' as const, text: 'This confirmation link is valid for 24 hours. If you didn’t create this account, you can ignore this email.' }]
        : []),
    ],
    cta: verify
      ? { label: 'Confirm my email', url: d.verifyUrl as string }
      : { label: 'Explore courses', url: `${ctx.siteUrl}/courses` },
    secondaryLink: verify ? { label: 'Explore courses meanwhile', url: `${ctx.siteUrl}/courses` } : undefined,
  };
}

export function verifyEmailEmail(ctx: EmailContext, d: { name: string; verifyUrl: string }): EmailSpec {
  return {
    subject: 'Confirm your FutureStack email address',
    preheader: 'Tap the button to confirm your email — the link works for 24 hours.',
    eyebrow: 'Account security',
    tone: 'info',
    icon: '✉️',
    title: 'Confirm your email address',
    intro: `Hi ${firstName(d.name)}, please confirm this is your email so we can send invoices and protect your account.`,
    blocks: [
      { type: 'note', tone: 'info', text: 'This link is valid for 24 hours. If you didn’t ask for it, you can safely ignore this email.' },
    ],
    cta: { label: 'Confirm my email', url: d.verifyUrl },
  };
}

// ─── 3. Payment failed ──────────────────────────────────────────────

export interface PaymentFailedData {
  name: string;
  orderRef: string;
  items: string[];
  amount: number;
  currency: Currency;
}

export function paymentFailedEmail(ctx: EmailContext, d: PaymentFailedData): EmailSpec {
  const first = d.items[0] ?? 'your order';
  return {
    subject: `Your payment didn’t go through — ${first}`,
    preheader: 'No money was taken for this attempt. You can try again in a minute.',
    eyebrow: 'Payment update',
    tone: 'warn',
    icon: '⚠️',
    title: 'Your payment didn’t go through',
    intro: `Hi ${firstName(d.name)}, the payment for ${first}${d.items.length > 1 ? ` and ${d.items.length - 1} more` : ''} could not be completed, so your enrolment hasn’t started yet.`,
    blocks: [
      {
        type: 'card',
        title: 'Attempt details',
        tone: 'warn',
        rows: [
          { label: 'Order', value: d.orderRef, mono: true },
          { label: 'Amount', value: formatMoney(d.amount, d.currency), strong: true },
        ],
      },
      {
        type: 'steps',
        title: 'What you can do',
        steps: [
          'Try again — a different card, UPI app or net banking often works.',
          'If money was deducted from your account, it is normally returned automatically within 5–7 working days.',
          'Still stuck? Reply to this email with a screenshot and we’ll sort it out.',
        ],
      },
    ],
    cta: { label: 'Try the payment again', url: `${ctx.siteUrl}/cart` },
    secondaryLink: { label: 'Contact support', url: `${ctx.siteUrl}/support` },
  };
}

// ─── 4. Refund processed / rejected ─────────────────────────────────

export interface RefundProcessedData {
  name: string;
  itemName: string;
  amount: number;
  currency: Currency;
  orderRef: string;
  /** Expected date the money reaches the student. */
  expectedBy: Date;
  etaDays: number;
}

export function refundProcessedEmail(ctx: EmailContext, d: RefundProcessedData): EmailSpec {
  return {
    subject: `Refund processed — ${formatMoney(d.amount, d.currency)} for ${d.itemName}`,
    preheader: `Your refund is on its way. Expected by ${formatDate(d.expectedBy)}.`,
    eyebrow: 'Refund',
    tone: 'success',
    icon: '💸',
    title: 'Your refund is on its way',
    intro: `Hi ${firstName(d.name)}, we’ve processed your refund for ${d.itemName}. It goes back to the same payment method you used.`,
    blocks: [
      {
        type: 'card',
        title: 'Refund details',
        tone: 'success',
        rows: [
          { label: 'Item', value: d.itemName },
          { label: 'Refund amount', value: formatMoney(d.amount, d.currency), strong: true },
          { label: 'Expected by', value: `${formatDate(d.expectedBy)} (within ${d.etaDays} ${plural(d.etaDays, 'day')})`, strong: true },
          { label: 'Order', value: d.orderRef, mono: true },
        ],
      },
      {
        type: 'note',
        tone: 'info',
        text: 'The refund is exactly what you paid for this item after any coupon, GST included. Banks sometimes take an extra day to show it on your statement.',
      },
    ],
    cta: { label: 'Track in Order History', url: `${ctx.siteUrl}/order-history` },
    secondaryLink: { label: 'Contact support', url: `${ctx.siteUrl}/support` },
  };
}

export interface RefundRejectedData {
  name: string;
  itemName: string;
  amount: number;
  currency: Currency;
  orderRef: string;
}

export function refundRejectedEmail(ctx: EmailContext, d: RefundRejectedData): EmailSpec {
  return {
    subject: `Update on your refund request — ${d.itemName}`,
    preheader: 'We weren’t able to approve this refund. Here is what you can do next.',
    eyebrow: 'Refund',
    tone: 'danger',
    icon: '📄',
    title: 'We couldn’t approve this refund',
    intro: `Hi ${firstName(d.name)}, after reviewing your request for ${d.itemName}, we’re unable to approve the refund. Your access stays active and nothing changes on your account.`,
    blocks: [
      {
        type: 'card',
        title: 'Request details',
        tone: 'danger',
        rows: [
          { label: 'Item', value: d.itemName },
          { label: 'Requested', value: formatMoney(d.amount, d.currency) },
          { label: 'Order', value: d.orderRef, mono: true },
        ],
      },
      {
        type: 'p',
        text: 'If you think this was a mistake, or your situation has changed, reply to this email or open a support ticket and we’ll take another look.',
      },
    ],
    cta: { label: 'Talk to support', url: `${ctx.siteUrl}/support` },
  };
}

// ─── 5. Gift enrolment ──────────────────────────────────────────────

export interface GiftData {
  name: string;
  itemName: string;
  kind: 'course' | 'project';
  giftCode: string;
  invoiceNumber?: string | null;
}

export function giftEnrollmentEmail(ctx: EmailContext, d: GiftData): EmailSpec {
  const noun = d.kind === 'project' ? 'project' : 'course';
  return {
    subject: `A gift for you: ${d.itemName}`,
    preheader: `You’ve been given free access to ${d.itemName}. Nothing to pay.`,
    eyebrow: 'You’ve got a gift',
    tone: 'brand',
    icon: '🎁',
    title: `You’ve been gifted ${d.itemName}`,
    intro: `Hi ${firstName(d.name)}, the FutureStack team has added this ${noun} to your account — free of charge. It’s ready for you to start.`,
    blocks: [
      {
        type: 'card',
        title: 'Gift details',
        tone: 'brand',
        rows: [
          { label: d.kind === 'project' ? 'Project' : 'Course', value: d.itemName },
          { label: 'Gift code', value: d.giftCode, mono: true },
          { label: 'Amount to pay', value: formatMoney(0), strong: true },
          ...(d.invoiceNumber ? [{ label: 'Invoice', value: d.invoiceNumber, mono: true }] : []),
        ],
      },
      {
        type: 'p',
        text: `A ₹0 invoice for this gift is saved in your Order History, so you always have a record of it.`,
      },
    ],
    cta: { label: d.kind === 'project' ? 'Open my project' : 'Start learning', url: `${ctx.siteUrl}/my-dashboard?tab=${d.kind === 'project' ? 'projects' : 'courses'}` },
    secondaryLink: { label: 'View in Order History', url: `${ctx.siteUrl}/order-history` },
  };
}

// ─── 6. Certificate ready ───────────────────────────────────────────

export interface CertificateData {
  name: string;
  courseName: string;
  credentialId: string;
  score?: number | null;
  issuedOn: Date;
}

export function certificateReadyEmail(ctx: EmailContext, d: CertificateData): EmailSpec {
  return {
    subject: `Congratulations! Your ${d.courseName} certificate is ready`,
    preheader: `You completed ${d.courseName}. Download and share your verified certificate.`,
    eyebrow: 'Certificate',
    tone: 'success',
    icon: '🏅',
    title: `You did it, ${firstName(d.name)}!`,
    intro: `You’ve completed ${d.courseName}. Your verified certificate has been issued — download it, add it to LinkedIn and show the world what you can build.`,
    blocks: [
      {
        type: 'card',
        title: 'Certificate',
        tone: 'success',
        rows: [
          { label: 'Course', value: d.courseName },
          { label: 'Credential ID', value: d.credentialId, mono: true, strong: true },
          ...(d.score != null ? [{ label: 'Average quiz score', value: `${d.score}%` }] : []),
          { label: 'Issued on', value: formatDate(d.issuedOn) },
        ],
      },
      {
        type: 'steps',
        title: 'Make it count',
        steps: [
          'Download your certificate from the Certificates section of your dashboard.',
          'Add it to LinkedIn → Licenses & certifications, using the Credential ID above.',
          'Leave a short review — it helps the next learner choose.',
        ],
      },
    ],
    cta: { label: 'View my certificate', url: `${ctx.siteUrl}/my-dashboard?tab=certificates` },
  };
}

// ─── 7. Trainer application ─────────────────────────────────────────

export function trainerApprovedEmail(ctx: EmailContext, d: { name: string }): EmailSpec {
  return {
    subject: 'Your FutureStack trainer application is approved',
    preheader: 'Welcome aboard — your trainer console is now fully unlocked.',
    eyebrow: 'Trainer application',
    tone: 'success',
    icon: '🎓',
    title: 'Welcome to the FutureStack faculty',
    intro: `Hi ${firstName(d.name)}, great news — your application has been approved. Your trainer console is unlocked.`,
    blocks: [
      {
        type: 'steps',
        title: 'Next steps',
        steps: [
          'Sign in and complete your trainer profile (photo, bio, expertise).',
          'Work with the content team to publish your first course or project.',
          'Answer student doubts in your course discussions.',
        ],
      },
    ],
    cta: { label: 'Open trainer console', url: `${ctx.siteUrl}/ops/trainer` },
  };
}

export function trainerRejectedEmail(ctx: EmailContext, d: { name: string; reason?: string | null }): EmailSpec {
  return {
    subject: 'Update on your FutureStack trainer application',
    preheader: 'We’re not able to move forward right now. Here are the details.',
    eyebrow: 'Trainer application',
    tone: 'warn',
    icon: '📝',
    title: 'Update on your application',
    intro: `Hi ${firstName(d.name)}, thank you for your interest in teaching on FutureStack. After review, we’re not able to approve your application at this time.`,
    blocks: [
      ...(d.reason?.trim()
        ? [{ type: 'card' as const, title: 'Feedback from our team', tone: 'warn' as const, rows: [{ label: 'Reason', value: d.reason.trim() }] }]
        : []),
      {
        type: 'p',
        text: 'This isn’t necessarily final. If you’d like to share more about your experience or have questions, reply to this email and our team will be happy to help.',
      },
    ],
    cta: { label: 'Contact our team', url: `${ctx.siteUrl}/support` },
  };
}

// ─── 8. Support ticket auto-close ───────────────────────────────────

export interface TicketMailData {
  name: string;
  ref: string;
  subject: string;
  ticketUrl: string;
}

export function ticketClosingSoonEmail(ctx: EmailContext, d: TicketMailData & { daysLeft: number }): EmailSpec {
  return {
    subject: `Still need help? Ticket ${d.ref} will close soon`,
    preheader: 'Reply once and we’ll keep it open.',
    eyebrow: 'Support',
    tone: 'info',
    icon: '⏳',
    title: 'Is your issue sorted?',
    intro: `Hi ${firstName(d.name)}, we haven’t heard back on your ticket. If everything is fine, there’s nothing to do — it will close automatically in about ${d.daysLeft} ${plural(d.daysLeft, 'day')}.`,
    blocks: [
      {
        type: 'card',
        title: 'Your ticket',
        tone: 'info',
        rows: [
          { label: 'Reference', value: d.ref, mono: true },
          { label: 'Subject', value: d.subject },
        ],
      },
      { type: 'p', text: 'Still need help? Just reply to this email or add a message to the ticket and we’ll keep it open.' },
    ],
    cta: { label: 'Reply to the ticket', url: d.ticketUrl },
  };
}

export function ticketClosedEmail(
  ctx: EmailContext,
  d: TicketMailData & { auto: boolean },
): EmailSpec {
  return {
    subject: `Ticket ${d.ref} is closed`,
    preheader: d.auto ? 'We closed it because we hadn’t heard back. You can always open a new one.' : 'Your ticket has been closed.',
    eyebrow: 'Support',
    tone: 'info',
    icon: '🔒',
    title: 'Your ticket is closed',
    intro: d.auto
      ? `Hi ${firstName(d.name)}, we closed this ticket because we hadn’t heard back for a few days. If you still need help, just open a new ticket and we’ll pick it up right away.`
      : `Hi ${firstName(d.name)}, your support ticket has been closed. You can still read the full conversation any time.`,
    blocks: [
      {
        type: 'card',
        title: 'Ticket',
        tone: 'info',
        rows: [
          { label: 'Reference', value: d.ref, mono: true },
          { label: 'Subject', value: d.subject },
        ],
      },
    ],
    cta: { label: 'Open a new ticket', url: `${ctx.siteUrl}/support` },
    secondaryLink: { label: 'Read this conversation', url: d.ticketUrl },
  };
}

// ─── 9. Password changed ────────────────────────────────────────────

export function passwordChangedEmail(ctx: EmailContext, d: { name: string; changedAt: Date }): EmailSpec {
  return {
    subject: 'Your FutureStack password was changed',
    preheader: 'If this wasn’t you, secure your account right away.',
    eyebrow: 'Account security',
    tone: 'warn',
    icon: '🔐',
    title: 'Your password was changed',
    intro: `Hi ${firstName(d.name)}, this is a confirmation that the password on your FutureStack account was changed on ${formatDateTime(d.changedAt)} (IST). You were signed out of your other devices.`,
    blocks: [
      {
        type: 'note',
        tone: 'danger',
        text: `Wasn’t you? Reset your password immediately and write to ${ctx.supportEmail} so we can secure your account.`,
      },
    ],
    cta: { label: 'Reset my password', url: `${ctx.siteUrl}/auth/forgot-password` },
  };
}
