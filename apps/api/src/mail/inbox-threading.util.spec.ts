import { normalizeSubject, toAddress } from './inbox-threading.util';
import { siteSourceOf } from './imap-inbox';

describe('inbox threading', () => {
  it('normalizeSubject drops stacked Re:/Fwd: prefixes and case', () => {
    expect(normalizeSubject('RE: Re: FWD: Refund please')).toBe('refund please');
    expect(normalizeSubject('  Refund please ')).toBe('refund please');
    expect(normalizeSubject(null)).toBe('');
  });

  it('toAddress keeps the display name only when there is one', () => {
    expect(toAddress({ name: 'Asha Rao', address: 'asha@x.com' })).toEqual({ email: 'asha@x.com', displayName: 'Asha Rao' });
    expect(toAddress({ name: '', address: 'asha@x.com' })).toEqual({ email: 'asha@x.com' });
    expect(toAddress(undefined)).toEqual({ email: '' });
  });

  it('siteSourceOf labels where a website mail came from', () => {
    expect(siteSourceOf('[Support] HIGH · Cannot log in', undefined)).toBe('Support ticket');
    expect(siteSourceOf('[Escalations] 3 need attention', undefined)).toBe('Escalation');
    expect(siteSourceOf('[R&D Inquiry] a@b.com', undefined)).toBe('R&D inquiry');
    expect(siteSourceOf('[Contact · Course question] Asha <a@b.com>', undefined)).toBe('Contact form');
    expect(siteSourceOf('[Careers] Application: QA Intern', undefined)).toBe('Careers');
    expect(siteSourceOf('Trainer Application — FutureStack Careers', undefined)).toBe('Careers');
    expect(siteSourceOf('Application: Video Editor', undefined)).toBe('Careers');
    expect(siteSourceOf('Application for Video Editor', undefined)).toBe('');
    expect(siteSourceOf('Re: Your ticket', '<fs-123@futurestack.co.in>')).toBe('Customer reply');
    expect(siteSourceOf('Hello', '<something-else@x.com>')).toBe('');
  });
});
