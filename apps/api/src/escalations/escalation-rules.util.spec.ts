import {
  bumpSeverity,
  complaintSeverity,
  escalationRef,
  hoursBetween,
  isActiveStatus,
  isSlaBreached,
  refundSeverity,
  severityForOverrun,
  ticketSeverity,
} from './escalation-rules.util';

describe('escalation-rules.util', () => {
  describe('bumpSeverity()', () => {
    it('moves up by the given steps', () => {
      expect(bumpSeverity('LOW', 1)).toBe('MEDIUM');
      expect(bumpSeverity('MEDIUM', 2)).toBe('CRITICAL');
    });

    it('never goes past CRITICAL', () => {
      expect(bumpSeverity('HIGH', 5)).toBe('CRITICAL');
      expect(bumpSeverity('CRITICAL', 1)).toBe('CRITICAL');
    });
  });

  describe('severityForOverrun()', () => {
    it('keeps the base severity while barely over the limit', () => {
      expect(severityForOverrun('MEDIUM', 50, 48)).toBe('MEDIUM');
    });

    it('bumps one level at 2x and two levels at 4x the limit', () => {
      expect(severityForOverrun('MEDIUM', 96, 48)).toBe('HIGH');
      expect(severityForOverrun('MEDIUM', 192, 48)).toBe('CRITICAL');
    });

    it('ignores a non-positive limit', () => {
      expect(severityForOverrun('MEDIUM', 500, 0)).toBe('MEDIUM');
    });
  });

  describe('per-source severity', () => {
    it('rates urgent / high priority tickets above normal ones', () => {
      expect(ticketSeverity('URGENT', 49, 48)).toBe('HIGH');
      expect(ticketSeverity('NORMAL', 49, 48)).toBe('MEDIUM');
    });

    it('starts refunds at HIGH and goes CRITICAL once badly overdue', () => {
      expect(refundSeverity(25, 24)).toBe('HIGH');
      expect(refundSeverity(48, 24)).toBe('CRITICAL');
    });

    it('rates a course by how many low ratings it collected', () => {
      expect(complaintSeverity(3, 3)).toBe('MEDIUM');
      expect(complaintSeverity(6, 3)).toBe('HIGH');
    });
  });

  describe('isSlaBreached()', () => {
    const now = new Date('2026-10-28T12:00:00Z');
    const past = new Date('2026-10-28T10:00:00Z');
    const future = new Date('2026-10-28T14:00:00Z');

    it('is true for an active escalation past its due time', () => {
      expect(isSlaBreached({ status: 'OPEN', dueAt: past }, now)).toBe(true);
    });

    it('is false before the due time, with no due time, or once closed', () => {
      expect(isSlaBreached({ status: 'OPEN', dueAt: future }, now)).toBe(false);
      expect(isSlaBreached({ status: 'OPEN', dueAt: null }, now)).toBe(false);
      expect(isSlaBreached({ status: 'RESOLVED', dueAt: past }, now)).toBe(
        false,
      );
      expect(isSlaBreached({ status: 'DISMISSED', dueAt: past }, now)).toBe(
        false,
      );
    });
  });

  it('treats OPEN / ASSIGNED / IN_PROGRESS as active', () => {
    expect(isActiveStatus('OPEN')).toBe(true);
    expect(isActiveStatus('ASSIGNED')).toBe(true);
    expect(isActiveStatus('IN_PROGRESS')).toBe(true);
    expect(isActiveStatus('RESOLVED')).toBe(false);
  });

  it('formats the human reference', () => {
    expect(escalationRef(42)).toBe('ESC-00042');
  });

  it('counts whole hours between two dates, never negative', () => {
    expect(
      hoursBetween(
        new Date('2026-10-28T00:00:00Z'),
        new Date('2026-10-28T05:30:00Z'),
      ),
    ).toBe(5);
    expect(
      hoursBetween(
        new Date('2026-10-28T05:00:00Z'),
        new Date('2026-10-28T00:00:00Z'),
      ),
    ).toBe(0);
  });
});
