/**
 * One renderer for every transactional email: logo header, hero, content
 * blocks, call-to-action, footer. Table-based layout with inline styles so it
 * looks the same in Gmail, Outlook and Apple Mail, and a plain-text twin is
 * produced from the same content (never written by hand twice).
 */

export type Tone = 'success' | 'info' | 'warn' | 'danger' | 'brand';

export interface EmailContext {
  /** Public site URL, no trailing slash — e.g. https://www.futurestack.co.in */
  siteUrl: string;
  /** Absolute public HTTPS URL of the logo (email clients can't load localhost). */
  logoUrl: string;
  supportEmail: string;
}

export interface Row {
  label: string;
  value: string;
  /** Emphasise the value (totals, amounts). */
  strong?: boolean;
  mono?: boolean;
}

export type Block =
  | { type: 'p'; text: string }
  | { type: 'card'; title?: string; rows: Row[]; tone?: Tone }
  | {
      type: 'items';
      items: { name: string; sub?: string; amount: string }[];
      totals: Row[];
    }
  | { type: 'steps'; title?: string; steps: string[] }
  | { type: 'note'; text: string; tone?: Tone };

export interface EmailSpec {
  subject: string;
  /** Inbox preview line shown next to the subject. */
  preheader: string;
  /** Small caps label top-right of the header, e.g. "ORDER CONFIRMATION". */
  eyebrow: string;
  tone: Tone;
  /** One emoji, shown in the hero badge. */
  icon: string;
  title: string;
  /** Opening line(s) under the title, e.g. "Hi Ram, thanks for…". */
  intro: string;
  blocks: Block[];
  cta?: { label: string; url: string };
  secondaryLink?: { label: string; url: string };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const PALETTE: Record<Tone, { soft: string; border: string; ink: string; badge: string }> = {
  success: { soft: '#f0fdf4', border: '#bbf7d0', ink: '#166534', badge: '#dcfce7' },
  info: { soft: '#eff6ff', border: '#bfdbfe', ink: '#1e40af', badge: '#dbeafe' },
  warn: { soft: '#fffbeb', border: '#fde68a', ink: '#92400e', badge: '#fef3c7' },
  danger: { soft: '#fef2f2', border: '#fecaca', ink: '#991b1b', badge: '#fee2e2' },
  brand: { soft: '#fff7ed', border: '#fed7aa', ink: '#9a3412', badge: '#ffedd5' },
};

const FONT = "'Segoe UI',Roboto,Arial,Helvetica,sans-serif";

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Only http(s) and mailto links are allowed through. */
export function safeUrl(url: string): string {
  return /^(https?:\/\/|mailto:)/i.test(url) ? esc(url) : '#';
}

export function formatMoney(amount: number, currency: 'INR' | 'USD' = 'INR'): string {
  const locale = currency === 'USD' ? 'en-US' : 'en-IN';
  const symbol = currency === 'USD' ? '$' : '₹';
  return symbol + amount.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/** "29 Oct 2026" in Indian time. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ── html pieces ─────────────────────────────────────────────────────

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14.5px;line-height:1.7;color:#334155;">${esc(text)}</p>`;
}

function rowsTable(rows: Row[], ink: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 16px 6px 0;font-size:13px;color:#64748b;vertical-align:top;white-space:nowrap;">${esc(r.label)}</td>
        <td align="right" style="padding:6px 0;font-size:${r.strong ? 15 : 13.5}px;font-weight:${r.strong ? 700 : 600};color:${r.strong ? ink : '#0f172a'};${r.mono ? "font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:12.5px;" : ''}vertical-align:top;word-break:break-word;">${esc(r.value)}</td>
      </tr>`,
    )
    .join('')}</table>`;
}

function blockHtml(b: Block): string {
  switch (b.type) {
    case 'p':
      return paragraph(b.text);
    case 'card': {
      const c = PALETTE[b.tone ?? 'info'];
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${c.soft};border:1px solid ${c.border};border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          ${b.title ? `<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${c.ink};margin-bottom:8px;">${esc(b.title)}</div>` : ''}
          ${rowsTable(b.rows, c.ink)}
        </td></tr>
      </table>`;
    }
    case 'items': {
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;overflow:hidden;">
        ${b.items
          .map(
            (it, i) => `
        <tr>
          <td style="padding:14px 16px;${i > 0 ? 'border-top:1px solid #eef0f4;' : ''}">
            <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.4;">${esc(it.name)}</div>
            ${it.sub ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(it.sub)}</div>` : ''}
          </td>
          <td align="right" style="padding:14px 16px;${i > 0 ? 'border-top:1px solid #eef0f4;' : ''}font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;vertical-align:top;">${esc(it.amount)}</td>
        </tr>`,
          )
          .join('')}
        <tr><td colspan="2" style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e5e7eb;">
          ${rowsTable(b.totals, '#0f172a')}
        </td></tr>
      </table>`;
    }
    case 'steps':
      return `
      <div style="margin:0 0 20px;">
        ${b.title ? `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">${esc(b.title)}</div>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${b.steps
            .map(
              (s, i) => `
          <tr>
            <td width="30" valign="top" style="padding:3px 0 10px;"><div style="width:22px;height:22px;border-radius:11px;background:#fff1e6;color:#c2410c;font-size:12px;font-weight:700;text-align:center;line-height:22px;">${i + 1}</div></td>
            <td valign="top" style="padding:3px 0 10px;font-size:14px;line-height:1.55;color:#334155;">${esc(s)}</td>
          </tr>`,
            )
            .join('')}
        </table>
      </div>`;
    case 'note': {
      const c = PALETTE[b.tone ?? 'warn'];
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td style="padding:12px 14px;background:${c.soft};border-left:3px solid ${c.ink};border-radius:6px;font-size:13px;line-height:1.6;color:${c.ink};">${esc(b.text)}</td></tr>
      </table>`;
    }
  }
}

function buttonHtml(label: string, url: string): string {
  return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 8px;">
        <tr><td align="center" bgcolor="#ff6b00" style="background-color:#ff6b00;background-image:linear-gradient(135deg,#ff7a1a,#f05a00);border-radius:10px;">
          <a href="${safeUrl(url)}" style="display:inline-block;padding:13px 30px;font-size:14.5px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;font-family:${FONT};">${esc(label)}</a>
        </td></tr>
      </table>`;
}

// ── text twin ───────────────────────────────────────────────────────

function blockText(b: Block): string[] {
  switch (b.type) {
    case 'p':
      return [b.text, ''];
    case 'card': {
      const out: string[] = [];
      if (b.title) out.push(b.title.toUpperCase());
      const w = Math.max(...b.rows.map((r) => r.label.length));
      for (const r of b.rows) out.push(`${r.label.padEnd(w)}  ${r.value}`);
      out.push('');
      return out;
    }
    case 'items': {
      const out: string[] = [];
      for (const it of b.items) out.push(`- ${it.name}${it.sub ? ` (${it.sub})` : ''}: ${it.amount}`);
      out.push('');
      const w = Math.max(...b.totals.map((r) => r.label.length));
      for (const r of b.totals) out.push(`${r.label.padEnd(w)}  ${r.value}`);
      out.push('');
      return out;
    }
    case 'steps':
      return [...(b.title ? [b.title.toUpperCase()] : []), ...b.steps.map((s, i) => `${i + 1}. ${s}`), ''];
    case 'note':
      return [`Note: ${b.text}`, ''];
  }
}

// ── public ──────────────────────────────────────────────────────────

export function renderEmail(spec: EmailSpec, ctx: EmailContext): RenderedEmail {
  const c = PALETTE[spec.tone];
  const year = new Date().getFullYear();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(spec.subject)}</title>
<style>
  @media only screen and (max-width:620px) {
    .container { width:100% !important; border-radius:0 !important; }
    .px { padding-left:22px !important; padding-right:22px !important; }
    .title { font-size:21px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f3f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f3f8;">${esc(spec.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f8;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;font-family:${FONT};">

      <!-- header: logo -->
      <tr><td class="px" style="padding:22px 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left">
            <a href="${safeUrl(ctx.siteUrl)}" style="text-decoration:none;"><img src="${safeUrl(ctx.logoUrl)}" alt="FutureStack" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;"></a>
          </td>
          <td align="right" style="font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;">${esc(spec.eyebrow)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;background:#ff6b00;background-image:linear-gradient(90deg,#ff6b00,#2563eb);font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- hero -->
      <tr><td class="px" style="padding:30px 32px 6px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;background:${c.badge};border-radius:26px;font-size:24px;line-height:52px;">${esc(spec.icon)}</td>
        </tr></table>
        <h1 class="title" style="margin:16px 0 8px;font-size:23px;font-weight:800;line-height:1.3;color:#0f172a;letter-spacing:-.01em;">${esc(spec.title)}</h1>
        <p style="margin:0 0 20px;font-size:14.5px;line-height:1.7;color:#475569;">${esc(spec.intro)}</p>
      </td></tr>

      <!-- content -->
      <tr><td class="px" style="padding:0 32px 14px;">
        ${spec.blocks.map(blockHtml).join('\n')}
        ${spec.cta ? buttonHtml(spec.cta.label, spec.cta.url) : ''}
        ${spec.secondaryLink ? `<div style="margin:6px 0 4px;font-size:13px;"><a href="${safeUrl(spec.secondaryLink.url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${esc(spec.secondaryLink.label)} &rarr;</a></div>` : ''}
        ${spec.cta ? `<p style="margin:14px 0 0;font-size:11.5px;line-height:1.6;color:#94a3b8;">Button not working? Copy this link into your browser:<br><span style="color:#2563eb;word-break:break-all;">${esc(spec.cta.url)}</span></p>` : ''}
      </td></tr>

      <!-- footer -->
      <tr><td class="px" style="padding:22px 32px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:12.5px;line-height:1.6;color:#475569;">
          Questions? Just reply to this email or write to <a href="mailto:${esc(ctx.supportEmail)}" style="color:#2563eb;text-decoration:none;">${esc(ctx.supportEmail)}</a> — a real person will get back to you.
        </p>
        <p style="margin:0 0 10px;font-size:12px;line-height:1.6;">
          <a href="${safeUrl(ctx.siteUrl + '/my-dashboard')}" style="color:#64748b;text-decoration:none;">My Dashboard</a> &nbsp;·&nbsp;
          <a href="${safeUrl(ctx.siteUrl + '/order-history')}" style="color:#64748b;text-decoration:none;">Order History</a> &nbsp;·&nbsp;
          <a href="${safeUrl(ctx.siteUrl + '/support')}" style="color:#64748b;text-decoration:none;">Help &amp; Support</a>
        </p>
        <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
          &copy; ${year} FutureStack &middot; Think. Create. Conquer.<br>
          You are receiving this because of activity on your FutureStack account. It is a service message, not a promotion.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    spec.title,
    '='.repeat(Math.min(spec.title.length, 60)),
    '',
    spec.intro,
    '',
    ...spec.blocks.flatMap(blockText),
    ...(spec.cta ? [`${spec.cta.label}: ${spec.cta.url}`, ''] : []),
    ...(spec.secondaryLink ? [`${spec.secondaryLink.label}: ${spec.secondaryLink.url}`, ''] : []),
    `Questions? Reply to this email or write to ${ctx.supportEmail}.`,
    '',
    `— FutureStack · Think. Create. Conquer.`,
  ].join('\n');

  return { subject: spec.subject, html, text };
}
