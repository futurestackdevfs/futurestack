import { EmailContext, EmailSpec, formatMoney, renderEmail } from './render';
import {
  certificateReadyEmail,
  giftEnrollmentEmail,
  orderConfirmationEmail,
  passwordChangedEmail,
  paymentFailedEmail,
  refundProcessedEmail,
  refundRejectedEmail,
  ticketClosedEmail,
  ticketClosingSoonEmail,
  trainerApprovedEmail,
  trainerRejectedEmail,
  verifyEmailEmail,
  welcomeEmail,
} from './transactional';

const ctx: EmailContext = {
  siteUrl: 'https://www.futurestack.co.in',
  logoUrl: 'https://www.futurestack.co.in/images/logo.png',
  supportEmail: 'support@futurestack.co.in',
};

const when = new Date('2026-10-29T08:30:00Z');

const specs: Record<string, EmailSpec> = {
  order: orderConfirmationEmail(ctx, {
    name: 'Ram Warhekar',
    orderRef: 'FS-1A2B3C4D',
    invoiceNumber: 'FS-202610-0042',
    paidAt: when,
    items: [
      { name: 'React Fundamentals', kind: 'course', amount: 4999 },
      { name: 'Chat App', kind: 'project', amount: 1499 },
    ],
    subtotal: 6498,
    discount: 500,
    couponCode: 'SAVE500',
    gstPercent: 18,
    gst: 1079.64,
    total: 7077.64,
    currency: 'INR',
    paymentMethod: 'UPI',
  }),
  welcome: welcomeEmail(ctx, { name: 'Ram Warhekar', verifyUrl: 'https://www.futurestack.co.in/auth/verify-email?token=abc' }),
  welcomeGoogle: welcomeEmail(ctx, { name: 'Ram Warhekar' }),
  verify: verifyEmailEmail(ctx, { name: 'Ram', verifyUrl: 'https://www.futurestack.co.in/auth/verify-email?token=abc' }),
  failed: paymentFailedEmail(ctx, { name: 'Ram', orderRef: 'FS-1A2B3C4D', items: ['React Fundamentals', 'Chat App'], amount: 7077.64, currency: 'INR' }),
  refund: refundProcessedEmail(ctx, { name: 'Ram', itemName: 'React Fundamentals', amount: 5899, currency: 'INR', orderRef: 'FS-1A2B3C4D', expectedBy: when, etaDays: 7 }),
  refundRejected: refundRejectedEmail(ctx, { name: 'Ram', itemName: 'React Fundamentals', amount: 5899, currency: 'INR', orderRef: 'FS-1A2B3C4D' }),
  gift: giftEnrollmentEmail(ctx, { name: 'Ram', itemName: 'React Fundamentals', kind: 'course', giftCode: 'GIFT', invoiceNumber: 'FS-202610-0043' }),
  certificate: certificateReadyEmail(ctx, { name: 'Ram', courseName: 'React Fundamentals', credentialId: 'FS-2026-RF-001', score: 91, issuedOn: when }),
  trainerOk: trainerApprovedEmail(ctx, { name: 'Ram' }),
  trainerNo: trainerRejectedEmail(ctx, { name: 'Ram', reason: 'We need at least 2 years of teaching experience.' }),
  closingSoon: ticketClosingSoonEmail(ctx, { name: 'Ram', ref: 'SUP-00042', subject: 'Cannot play video', ticketUrl: 'https://www.futurestack.co.in/support/tickets/abc', daysLeft: 1 }),
  closedAuto: ticketClosedEmail(ctx, { name: 'Ram', ref: 'SUP-00042', subject: 'Cannot play video', ticketUrl: 'https://www.futurestack.co.in/support/tickets/abc', auto: true }),
  closedManual: ticketClosedEmail(ctx, { name: 'Ram', ref: 'SUP-00042', subject: 'Cannot play video', ticketUrl: 'https://www.futurestack.co.in/support/tickets/abc', auto: false }),
  password: passwordChangedEmail(ctx, { name: 'Ram', changedAt: when }),
};

describe('transactional email templates', () => {
  describe.each(Object.entries(specs))('%s', (_name, spec) => {
    const out = renderEmail(spec, ctx);

    it('has a subject, a preview line and a title', () => {
      expect(out.subject.length).toBeGreaterThan(10);
      expect(spec.preheader.length).toBeGreaterThan(10);
      expect(out.html).toContain(spec.title.replace(/&/g, '&amp;').replace(/’/g, '’'));
    });

    it('shows the FutureStack logo from an absolute https URL', () => {
      expect(out.html).toMatch(/<img src="https:\/\/www\.futurestack\.co\.in\/images\/logo\.png"[^>]*alt="FutureStack"/);
    });

    it('is a complete HTML document with a plain-text twin and no leftovers', () => {
      expect(out.html.startsWith('<!doctype html>')).toBe(true);
      expect(out.text).toContain(spec.title);
      for (const bad of ['undefined', 'NaN', '[object Object]', 'null']) {
        expect(out.html).not.toContain(bad);
        expect(out.text).not.toContain(bad);
      }
    });

    it('puts the call-to-action in both versions', () => {
      if (!spec.cta) return;
      expect(out.html).toContain(`href="${spec.cta.url}"`);
      expect(out.text).toContain(spec.cta.url);
    });

    it('keeps the support address in the footer', () => {
      expect(out.html).toContain('mailto:support@futurestack.co.in');
    });
  });

  it('escapes anything a user could have typed (names, course titles, reasons)', () => {
    const evil = '<script>alert(1)</script>"><img src=x onerror=alert(2)>';
    const out = renderEmail(
      orderConfirmationEmail(ctx, {
        name: evil,
        orderRef: evil,
        paidAt: when,
        items: [{ name: evil, kind: 'course', amount: 1 }],
        subtotal: 1,
        discount: 0,
        gstPercent: 0,
        gst: 0,
        total: 1,
        currency: 'INR',
      }),
      ctx,
    );
    expect(out.html).not.toContain('<script>alert');
    expect(out.html).not.toContain('<img src=x');
    expect(out.html).toContain('&lt;script&gt;');
  });

  it('refuses javascript: links', () => {
    const out = renderEmail({ ...specs.verify, cta: { label: 'Go', url: 'javascript:alert(1)' } }, ctx);
    expect(out.html).not.toContain('javascript:alert(1)"');
    expect(out.html).toContain('href="#"');
  });

  it('order confirmation lists items, discount, GST and the total', () => {
    const { html, text } = renderEmail(specs.order, ctx);
    for (const s of ['React Fundamentals', 'Chat App', 'SAVE500', 'GST (18%)', 'FS-202610-0042']) {
      expect(html).toContain(s);
      expect(text).toContain(s);
    }
    expect(html).toContain('₹7,077.64');
    expect(specs.order.subject).toBe('Payment received — ₹7,077.64 for React Fundamentals +1 more');
  });

  it('order confirmation links to courses when the order has a course', () => {
    expect(specs.order.cta?.url).toBe('https://www.futurestack.co.in/my-dashboard?tab=courses');
  });

  it('welcome asks to verify for password signups but not for Google signups', () => {
    expect(specs.welcome.cta?.label).toBe('Confirm my email');
    expect(specs.welcomeGoogle.cta?.label).toBe('Explore courses');
  });

  it('refund email tells the student the date, not just "5-7 days"', () => {
    const { html } = renderEmail(specs.refund, ctx);
    expect(html).toContain('29 Oct 2026');
    expect(html).toContain('within 7 days');
  });

  it('trainer rejection shows the reason only when there is one', () => {
    expect(renderEmail(specs.trainerNo, ctx).html).toContain('2 years of teaching');
    const noReason = renderEmail(trainerRejectedEmail(ctx, { name: 'Ram' }), ctx).html;
    expect(noReason).not.toContain('Feedback from our team');
  });

  it('auto-closed and manual close read differently', () => {
    expect(specs.closedAuto.intro).toContain('hadn’t heard back');
    expect(specs.closedManual.intro).not.toContain('hadn’t heard back');
  });

  it('formats money in rupees and dollars', () => {
    expect(formatMoney(1234567.5)).toBe('₹12,34,567.5');
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.5');
  });
});
