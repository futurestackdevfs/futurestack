import { Prisma } from '@prisma/client';

/**
 * Tiny helper so specs can build fixture rows that carry real
 * `Prisma.Decimal` values (matching what the actual PrismaService would
 * hand back) instead of plain numbers — several bugs in this codebase
 * (see sales-targets) only show up when Decimal arithmetic sneaks past
 * an `as any` cast, so fixtures need to look like the real thing.
 */
export function decimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** A realistic coupon row, override individual fields per test. */
export function makeCoupon(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__coupon-1',
    code: 'LAUNCH25',
    discountType: 'PERCENT',
    value: decimal(25),
    currency: null,
    applicableCourseIds: [] as string[],
    minOrderAmount: null,
    maxUses: null,
    usedCount: 0,
    perUserLimit: 1,
    isActive: true,
    validFrom: null,
    validUntil: null,
    createdByAdminId: '__spec__admin-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

/** A realistic SalesTarget row shaped exactly like a Prisma read (Decimal columns). */
export function makeSalesTarget(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__target-1',
    salespersonId: '__spec__sales-1',
    salesperson: { id: '__spec__sales-1', name: '__spec__ Priya Nair' },
    courseId: null,
    course: null,
    period: 'MONTHLY',
    targetAmount: decimal(200000),
    currentAmount: decimal(50000),
    startDate: new Date('2026-09-01T00:00:00Z'),
    endDate: new Date('2026-09-30T00:00:00Z'),
    createdAt: new Date('2026-08-25T00:00:00Z'),
    ...overrides,
  };
}
