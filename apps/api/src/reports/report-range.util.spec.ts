import { BadRequestException } from '@nestjs/common';
import {
  bucketKeys,
  bucketKey,
  bucketKind,
  bucketLabel,
  deltaPct,
  istDateString,
  parseRange,
  previousRange,
} from './report-range.util';

describe('report-range.util', () => {
  const now = new Date('2026-10-28T10:00:00Z'); // 15:30 IST

  describe('parseRange()', () => {
    it('defaults to the last 30 days, today included', () => {
      const r = parseRange(undefined, undefined, now);
      expect(r.toStr).toBe('2026-10-28');
      expect(r.fromStr).toBe('2026-09-29');
      expect(r.days).toBe(30);
    });

    it('uses IST midnight-to-midnight boundaries', () => {
      const r = parseRange('2026-10-01', '2026-10-01', now);
      expect(r.from.toISOString()).toBe('2026-09-30T18:30:00.000Z');
      expect(r.to.toISOString()).toBe('2026-10-01T18:29:59.999Z');
      expect(r.days).toBe(1);
    });

    it('rejects malformed dates', () => {
      expect(() => parseRange('01-10-2026', '2026-10-05', now)).toThrow(
        BadRequestException,
      );
      expect(() => parseRange('2026-02-31', '2026-03-05', now)).toThrow(
        BadRequestException,
      );
    });

    it('rejects a start after the end', () => {
      expect(() => parseRange('2026-10-10', '2026-10-01', now)).toThrow(
        /on or before/,
      );
    });

    it('rejects ranges longer than a year', () => {
      expect(() => parseRange('2025-01-01', '2026-10-01', now)).toThrow(
        /at most/,
      );
    });
  });

  describe('previousRange()', () => {
    it('is the same length, ending the day before', () => {
      const r = parseRange('2026-10-08', '2026-10-14', now); // 7 days
      const p = previousRange(r);
      expect(p.fromStr).toBe('2026-10-01');
      expect(p.toStr).toBe('2026-10-07');
      expect(p.days).toBe(7);
    });
  });

  describe('buckets', () => {
    it('uses days for short ranges and months for long ones', () => {
      expect(bucketKind(parseRange('2026-10-01', '2026-10-31', now))).toBe(
        'day',
      );
      expect(bucketKind(parseRange('2026-04-01', '2026-10-28', now))).toBe(
        'month',
      );
    });

    it('lists every day, including empty ones', () => {
      const keys = bucketKeys(
        parseRange('2026-10-01', '2026-10-04', now),
        'day',
      );
      expect(keys).toEqual([
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
      ]);
    });

    it('lists each month once', () => {
      const keys = bucketKeys(
        parseRange('2026-08-15', '2026-10-20', now),
        'month',
      );
      expect(keys).toEqual(['2026-08', '2026-09', '2026-10']);
    });

    it('buckets a late-evening UTC time into the right IST day', () => {
      // 20:00 UTC on the 1st is 01:30 IST on the 2nd.
      expect(bucketKey(new Date('2026-10-01T20:00:00Z'), 'day')).toBe(
        '2026-10-02',
      );
      expect(istDateString(new Date('2026-10-01T20:00:00Z'))).toBe(
        '2026-10-02',
      );
    });

    it('formats axis labels', () => {
      expect(bucketLabel('2026-10-05', 'day')).toBe('05 Oct');
      expect(bucketLabel('2026-10', 'month')).toBe('Oct 2026');
    });
  });

  describe('deltaPct()', () => {
    it('computes the percentage change to one decimal', () => {
      expect(deltaPct(150, 100)).toBe(50);
      expect(deltaPct(90, 120)).toBe(-25);
      expect(deltaPct(101, 300)).toBe(-66.3);
    });

    it('returns null when there is no baseline', () => {
      expect(deltaPct(10, 0)).toBeNull();
    });
  });
});
