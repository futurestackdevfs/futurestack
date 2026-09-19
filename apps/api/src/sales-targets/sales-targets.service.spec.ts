import { SalesTargetsService } from './sales-targets.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal, makeSalesTarget } from '../test-utils/fixtures';

/**
 * `buildTarget()` is the function that had the Float->Decimal migration bug:
 * targetAmount/currentAmount used to be plain JS numbers off Prisma, but after
 * the schema moved those columns to Decimal, an `as any` cast let raw Decimal
 * objects flow into arithmetic like `currentAmount - targetAmount`, which
 * (because Decimal has no valueOf that Math likes) produced NaN/garbage
 * instead of throwing. These fixtures use real `Prisma.Decimal` instances —
 * exactly what a live Prisma read returns — so a regression of that class
 * would fail these tests again.
 */
describe('SalesTargetsService', () => {
  let service: SalesTargetsService;
  let prisma: { salesTarget: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { salesTarget: { findMany: jest.fn() } };
    service = new SalesTargetsService(prisma as unknown as PrismaService);
  });

  // buildTarget is private — reach in the same way a colleague debugging this
  // exact bug would: call it directly rather than only through getTargets().
  function buildTarget(row: unknown) {
    return (service as unknown as { buildTarget: (t: unknown) => any }).buildTarget(row);
  }

  describe('buildTarget() Decimal arithmetic', () => {
    it('converts Decimal targetAmount/currentAmount to real numbers, not stringified Decimals', () => {
      const built = buildTarget(
        makeSalesTarget({ targetAmount: decimal(200000), currentAmount: decimal(50000) }),
      );

      expect(typeof built.targetAmount).toBe('number');
      expect(typeof built.currentAmount).toBe('number');
      expect(built.targetAmount).toBe(200000);
      expect(built.currentAmount).toBe(50000);
    });

    it('computes remaining and progressPct correctly from Decimal inputs (the regression case)', () => {
      const built = buildTarget(
        makeSalesTarget({ targetAmount: decimal(200000), currentAmount: decimal(50000) }),
      );

      // Under the bug, `targetAmount - currentAmount` on raw Decimal objects
      // produced NaN because JS `-` doesn't call Decimal's arithmetic methods.
      expect(built.remaining).toBe(150000);
      expect(built.progressPct).toBe(25);
      expect(Number.isNaN(built.remaining)).toBe(false);
      expect(Number.isNaN(built.progressPct)).toBe(false);
    });

    it('marks a target completed once currentAmount reaches targetAmount, using numeric comparison', () => {
      const built = buildTarget(
        makeSalesTarget({ targetAmount: decimal(100000), currentAmount: decimal(100000) }),
      );
      expect(built.isCompleted).toBe(true);
      expect(built.remaining).toBe(0);
      expect(built.progressPct).toBe(100);
    });

    it('never reports negative remaining when currentAmount overshoots the target', () => {
      const built = buildTarget(
        makeSalesTarget({ targetAmount: decimal(100000), currentAmount: decimal(150000) }),
      );
      expect(built.remaining).toBe(0);
      expect(built.progressPct).toBe(100); // capped, not 150%
    });

    it('falls back gracefully for a targetAmount of 0 (no divide-by-zero NaN)', () => {
      const built = buildTarget(
        makeSalesTarget({ targetAmount: decimal(0), currentAmount: decimal(0) }),
      );
      expect(built.progressPct).toBe(0);
      expect(Number.isNaN(built.progressPct)).toBe(false);
    });
  });

  describe('getTargets() summary aggregation', () => {
    it('sums Decimal-derived amounts across multiple targets without NaN creeping in', async () => {
      prisma.salesTarget.findMany.mockResolvedValue([
        makeSalesTarget({
          id: '__spec__t1',
          targetAmount: decimal(100000),
          currentAmount: decimal(100000),
        }),
        makeSalesTarget({
          id: '__spec__t2',
          targetAmount: decimal(50000),
          currentAmount: decimal(10000),
        }),
      ]);

      const result = await service.getTargets('__spec__sales-1', 'SALES' as any);

      expect(result.summary.totalTarget).toBe(150000);
      expect(result.summary.totalAchieved).toBe(110000);
      expect(result.summary.completedCount).toBe(1);
      expect(Number.isNaN(result.summary.overallProgressPct)).toBe(false);
    });
  });
});
