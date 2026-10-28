import { PrismaService } from '../prisma/prisma.service';
import {
  DateRange,
  bucketKey,
  bucketKeys,
  bucketKind,
  bucketLabel,
  deltaPct,
  previousRange,
  round2,
} from './report-range.util';
import { Report } from './report.types';

const inRange = (r: DateRange) => ({ gte: r.from, lte: r.to });

export async function buildEnrollmentsReport(
  prisma: PrismaService,
  range: DateRange,
): Promise<Report> {
  const prev = previousRange(range);
  const kind = bucketKind(range);
  const keys = bucketKeys(range, kind);

  const [
    enrolledNow,
    enrolledPrev,
    signupsNow,
    signupsPrev,
    signupsWhoBought,
    certsNow,
    activeStudents,
    inRangeEnrollments,
    perCourseRange,
    perCourseAll,
    perCourseCerts,
    courses,
  ] = await Promise.all([
    prisma.enrollment.count({ where: { enrolledAt: inRange(range) } }),
    prisma.enrollment.count({ where: { enrolledAt: inRange(prev) } }),
    prisma.user.count({
      where: { role: 'STUDENT', createdAt: inRange(range) },
    }),
    prisma.user.count({ where: { role: 'STUDENT', createdAt: inRange(prev) } }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        createdAt: inRange(range),
        enrollments: { some: {} },
      },
    }),
    prisma.certificate.count({ where: { issuedAt: inRange(range) } }),
    prisma.user.count({
      where: { role: 'STUDENT', enrollments: { some: { status: 'active' } } },
    }),
    prisma.enrollment.findMany({
      where: { enrolledAt: inRange(range) },
      select: { enrolledAt: true },
      take: 50000,
    }),
    prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { enrolledAt: inRange(range) },
      _count: { _all: true },
      _sum: { amountPaid: true },
    }),
    prisma.enrollment.groupBy({ by: ['courseId'], _count: { _all: true } }),
    prisma.certificate.groupBy({ by: ['courseId'], _count: { _all: true } }),
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        averageRating: true,
        reviewCount: true,
        trainer: { select: { name: true } },
      },
    }),
  ]);

  const perDay = new Map(keys.map((k) => [k, 0]));
  for (const e of inRangeEnrollments) {
    const k = bucketKey(e.enrolledAt, kind);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }

  const rangeBy = new Map(perCourseRange.map((r) => [r.courseId, r]));
  const allBy = new Map(perCourseAll.map((r) => [r.courseId, r._count._all]));
  const certBy = new Map(
    perCourseCerts.map((r) => [r.courseId, r._count._all]),
  );

  let revenue = 0;
  const rows = courses
    .filter((c) => (allBy.get(c.id) ?? 0) > 0)
    .map((c) => {
      const r = rangeBy.get(c.id);
      const total = allBy.get(c.id) ?? 0;
      const certs = certBy.get(c.id) ?? 0;
      const paid = r?._sum.amountPaid?.toNumber() ?? 0;
      revenue += paid;
      return {
        course: c.title,
        trainer: c.trainer?.name ?? '—',
        status: c.status,
        newEnrollments: r?._count._all ?? 0,
        totalEnrollments: total,
        revenue: round2(paid),
        certificates: certs,
        completion: total ? round2((certs / total) * 100) : 0,
        rating: c.reviewCount > 0 ? round2(c.averageRating) : null,
        reviews: c.reviewCount,
      };
    })
    .sort(
      (a, b) =>
        b.newEnrollments - a.newEnrollments ||
        b.totalEnrollments - a.totalEnrollments,
    );

  return {
    type: 'enrollments',
    title: 'Enrollments & courses',
    description: 'Who joined, how many bought, and how each course is doing.',
    range: { from: range.fromStr, to: range.toStr },
    kpis: [
      {
        label: 'New enrollments',
        value: enrolledNow,
        format: 'count',
        deltaPct: deltaPct(enrolledNow, enrolledPrev),
      },
      {
        label: 'New student signups',
        value: signupsNow,
        format: 'count',
        deltaPct: deltaPct(signupsNow, signupsPrev),
      },
      {
        label: 'Signup → purchase',
        value: signupsNow ? round2((signupsWhoBought / signupsNow) * 100) : 0,
        format: 'percent',
        hint: `${signupsWhoBought} of ${signupsNow} new students bought`,
      },
      { label: 'Certificates issued', value: certsNow, format: 'count' },
      {
        label: 'Active students',
        value: activeStudents,
        format: 'count',
        hint: 'with a live enrollment, all time',
      },
    ],
    chart: {
      title: `New enrollments per ${kind}`,
      format: 'count',
      labels: keys.map((k) => bucketLabel(k, kind)),
      series: [
        { name: 'Enrollments', values: keys.map((k) => perDay.get(k) ?? 0) },
      ],
    },
    tables: [
      {
        title: 'Course performance',
        note: 'Completion = certificates issued ÷ all-time enrollments. Revenue is what students paid in this period.',
        columns: [
          { key: 'course', label: 'Course' },
          { key: 'trainer', label: 'Trainer' },
          { key: 'status', label: 'Status' },
          { key: 'newEnrollments', label: 'New (period)', format: 'count' },
          { key: 'totalEnrollments', label: 'Total enrolled', format: 'count' },
          { key: 'revenue', label: 'Revenue (period)', format: 'money' },
          { key: 'certificates', label: 'Certificates', format: 'count' },
          { key: 'completion', label: 'Completion', format: 'percent' },
          { key: 'rating', label: 'Rating' },
          { key: 'reviews', label: 'Reviews', format: 'count' },
        ],
        rows,
      },
    ],
    notes: [
      `Revenue column adds up to ${round2(revenue).toLocaleString('en-IN')} across all courses; amounts are as recorded at enrollment.`,
    ],
  };
}
