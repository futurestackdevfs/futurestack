import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

// AgentMail is replaced by a stub: nothing is ever sent, the tests only look at
// the html / text / subject that WOULD have been sent.
function setup() {
  const config = {
    get: (key: string) =>
      ({ AGENTMAIL_API_KEY: '__spec__key', AGENTMAIL_INBOX_ID: 'Spec <inbox@agentmail.to>', FRONTEND_URL: 'https://app.example.com' } as Record<string, string>)[key],
  } as unknown as ConfigService;
  const service = new MailService(config);
  const send = jest.fn().mockResolvedValue({});
  (service as any).client = { inboxes: { messages: { send } } };
  const sent = () => send.mock.calls[0][1] as { to: string; subject: string; text: string; html: string };
  return { service, send, sent };
}

const XSS = '<img src=x onerror=alert(1)>';
const LINK = '<a href="https://evil.example/login">Verify your admin session</a>';

describe('MailService - user-controlled values are HTML-escaped in email bodies', () => {
  it('escapes a ticket subject, category and priority in the new-ticket email sent to staff', async () => {
    const { service, sent } = setup();

    await service.sendAgentNewTicketEmail('inbox@agentmail.to', {
      subject: LINK,
      category: 'Billing & <Refunds>',
      priority: 'HIGH',
      url: 'https://app.example.com/ops/support/1',
    });

    const { html } = sent();
    expect(html).not.toContain('<a href="https://evil.example/login">');
    expect(html).toContain('&lt;a href=&quot;https://evil.example/login&quot;&gt;Verify your admin session&lt;/a&gt;');
    expect(html).toContain('Billing &amp; &lt;Refunds&gt;');
  });

  it('keeps the plain-text part and the Subject header as plain text (no HTML entities)', async () => {
    const { service, sent } = setup();

    await service.sendAgentNewTicketEmail('inbox@agentmail.to', {
      subject: 'Fish & chips <help>',
      category: 'General',
      priority: 'LOW',
      url: 'https://app.example.com/ops/support/2',
    });

    const { text, subject } = sent();
    expect(text).toContain('Fish & chips <help>');
    expect(text).not.toContain('&amp;');
    expect(subject).toBe('[Support] LOW · Fish & chips <help>');
  });

  it('escapes the student name and ticket subject in student-facing ticket emails', async () => {
    const { service, send, sent } = setup();

    await service.sendTicketReplyEmail('s@example.com', {
      studentName: XSS,
      subject: LINK,
      preview: `agent says <b>hi</b> & ${XSS}`,
      url: 'https://app.example.com/support/tickets/1',
    });
    expect(send).toHaveBeenCalledTimes(1);
    const { html } = sent();
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<a href="https://evil.example/login">');
    expect(html).not.toContain('<b>hi</b>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes a student name / course name in the sale confirmation email', async () => {
    const { service, sent } = setup();

    await service.sendSaleConfirmedEmail('s@example.com', {
      studentName: XSS,
      courseName: `React <script>alert(1)</script>`,
      courseLink: 'https://app.example.com/courses/react',
      finalAmt: 4999,
      batchMode: 'Online',
      paymentMethod: 'UPI',
      receiptNo: 'R-1',
      orderId: 'o-1',
    } as any);

    const { html } = sent();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('React &lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes the generated temporary password so characters like & and < render correctly', async () => {
    const { service, sent } = setup();

    await service.sendStaffCredentialsEmail('staff@example.com', {
      name: 'Asha <Admin>',
      role: 'COORDINATOR',
      loginEmail: 'asha@example.com',
      tempPassword: 'a&b<c>"d\'',
      loginUrl: 'https://app.example.com/auth/staff-login',
    });

    const { html, text } = sent();
    expect(html).toContain('a&amp;b&lt;c&gt;&quot;d&#39;');
    expect(html).toContain('Asha &lt;Admin&gt;');
    expect(text).toContain(`a&b<c>"d'`); // plain text stays exact
  });
});

describe('MailService - links in emails only ever use http(s)', () => {
  it('replaces a javascript: link with "#" instead of putting it in an href', async () => {
    const { service, sent } = setup();

    await service.sendAgentNewTicketEmail('inbox@agentmail.to', {
      subject: 's',
      category: 'c',
      priority: 'p',
      url: 'javascript:alert(document.cookie)',
    });

    const { html } = sent();
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });

  it('escapes quotes in a URL so it cannot break out of the href attribute', async () => {
    const { service, sent } = setup();

    await service.sendTicketResolvedEmail('s@example.com', {
      studentName: 'S',
      subject: 'Done',
      url: 'https://app.example.com/x" onmouseover="alert(1)',
    });

    const { html } = sent();
    expect(html).not.toContain('" onmouseover="alert(1)');
    expect(html).toContain('href="https://app.example.com/x&quot; onmouseover=&quot;alert(1)"');
  });

  it('leaves a normal https link untouched', async () => {
    const { service, sent } = setup();

    await service.sendTicketResolvedEmail('s@example.com', {
      studentName: 'S',
      subject: 'Done',
      url: 'https://app.example.com/support/tickets/9?x=1&y=2',
    });

    expect(sent().html).toContain('href="https://app.example.com/support/tickets/9?x=1&amp;y=2"');
  });
});
