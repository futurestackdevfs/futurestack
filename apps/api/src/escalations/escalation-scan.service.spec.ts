import { EscalationScanService } from './escalation-scan.service';
import { EscalationsService } from './escalations.service';
import { PrismaService } from '../prisma/prisma.service';

// Mocked PrismaService / EscalationsService — no live DB is ever opened.
function makePrismaMock() {
  const emptyList = () => jest.fn().mockResolvedValue([]);
  return {
    supportTicket: { findMany: emptyList() },
    refund: { findMany: emptyList() },
    order: { findMany: emptyList() },
    enrollment: { findMany: emptyList() },
    video: { findMany: emptyList() },
    review: { groupBy: emptyList() },
    course: { findMany: emptyList() },
    escalation: {
      findMany: emptyList(),
      count: jest.fn().mockResolvedValue(0),
    },
    user: { findMany: emptyList() },
  } as unknown as PrismaService;
}

const SETTINGS = {
  id: 's',
  ticketSlaHours: 48,
  refundPendingHours: 24,
  paidGraceMinutes: 60,
  complaintMinCount: 3,
  complaintWindowDays: 14,
  coordinatorSlaDays: 3,
  resolveSlaHours: 24,
  alertsEnabled: true,
  updatedAt: new Date(),
};

describe('EscalationScanService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let esc: {
    getSettings: jest.Mock;
    raise: jest.Mock;
    autoResolveCleared: jest.Mock;
    notifyRaised: jest.Mock;
  };
  let service: EscalationScanService;

  beforeEach(() => {
    prisma = makePrismaMock();
    esc = {
      getSettings: jest.fn().mockResolvedValue(SETTINGS),
      raise: jest.fn().mockImplementation(async (input) => ({
        escalation: { id: 'e', ...input },
        raised: true,
      })),
      autoResolveCleared: jest.fn().mockResolvedValue(0),
      notifyRaised: jest.fn().mockResolvedValue(undefined),
    };
    service = new EscalationScanService(
      prisma,
      esc as unknown as EscalationsService,
    );
  });

  it('raises an escalation for a ticket waiting past its SLA', async () => {
    (prisma.supportTicket.findMany as jest.Mock).mockResolvedValue([
      {
        id: 't1',
        number: 12,
        subject: 'Cannot log in',
        priority: 'NORMAL',
        studentId: 'stu',
        lastMessageAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
      },
    ]);

    const result = await service.scan();

    expect(result.raised).toBe(1);
    const call = esc.raise.mock.calls.find(
      ([i]) => i.type === 'SUPPORT_TICKET',
    );
    expect(call?.[0]).toMatchObject({
      dedupeKey: 'TICKET:t1',
      ticketId: 't1',
      studentId: 'stu',
      autoRaised: true,
      severity: 'MEDIUM',
    });
    expect(call?.[0].title).toContain('SUP-00012');
  });

  it('flags a pending refund and a failed video', async () => {
    (prisma.refund.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        orderId: 'o1',
        studentId: 'stu',
        courseId: 'c1',
        amount: { toNumber: () => 1180 },
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        order: { currency: 'INR' },
      },
    ]);
    (prisma.video.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'v1',
        title: 'Intro',
        section: { courseId: 'c1', course: { title: 'React' } },
      },
    ]);

    await service.scan();

    const types = esc.raise.mock.calls.map(([i]) => i.type);
    expect(types).toEqual(expect.arrayContaining(['REFUND', 'CONTENT']));
    const refund = esc.raise.mock.calls.find(([i]) => i.type === 'REFUND')![0];
    expect(refund).toMatchObject({
      dedupeKey: 'REFUND:r1',
      severity: 'HIGH',
      refundId: 'r1',
    });
  });

  it('flags a paid order that has no enrollment as CRITICAL', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'o1',
        userId: 'stu',
        totalAmount: { toNumber: () => 1 },
        razorpayOrderId: 'order_abc',
        invoices: [{ id: 'inv' }],
        items: [{ courseId: 'c1', status: null }],
      },
    ]);

    await service.scan();

    const payment = esc.raise.mock.calls.find(
      ([i]) => i.type === 'PAYMENT',
    )![0];
    expect(payment).toMatchObject({
      dedupeKey: 'PAYMENT:o1',
      severity: 'CRITICAL',
      courseId: 'c1',
    });
  });

  it('does not flag a paid order that is fully enrolled and invoiced', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'o1',
        userId: 'stu',
        totalAmount: { toNumber: () => 1 },
        razorpayOrderId: 'order_abc',
        invoices: [{ id: 'inv' }],
        items: [{ courseId: 'c1', status: null }],
      },
    ]);
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([
      { studentId: 'stu', courseId: 'c1' },
    ]);

    await service.scan();

    expect(esc.raise.mock.calls.some(([i]) => i.type === 'PAYMENT')).toBe(
      false,
    );
  });

  it('does not require an invoice for cash (MANUAL-) sales', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'o2',
        userId: 'stu',
        totalAmount: { toNumber: () => 1 },
        razorpayOrderId: 'MANUAL-o2',
        invoices: [],
        items: [{ courseId: 'c1', status: null }],
      },
    ]);
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([
      { studentId: 'stu', courseId: 'c1' },
    ]);

    await service.scan();

    expect(esc.raise.mock.calls.some(([i]) => i.type === 'PAYMENT')).toBe(
      false,
    );
  });

  it('flags a course that collects enough low ratings', async () => {
    (prisma.review.groupBy as jest.Mock).mockResolvedValue([
      { courseId: 'c1', _count: { _all: 3 } },
      { courseId: 'c2', _count: { _all: 1 } },
    ]);
    (prisma.course.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', title: 'React' },
    ]);

    await service.scan();

    const complaints = esc.raise.mock.calls.filter(
      ([i]) => i.type === 'COMPLAINT',
    );
    expect(complaints).toHaveLength(1);
    expect(complaints[0][0]).toMatchObject({
      dedupeKey: 'COMPLAINT:c1',
      courseId: 'c1',
    });
  });

  it('auto-resolves cleared problems for every type with the keys still active', async () => {
    (prisma.supportTicket.findMany as jest.Mock).mockResolvedValue([
      {
        id: 't1',
        number: 1,
        subject: 's',
        priority: 'NORMAL',
        studentId: 'stu',
        lastMessageAt: new Date(0),
      },
    ]);

    await service.scan();

    const ticketCall = esc.autoResolveCleared.mock.calls.find(
      ([type]) => type === 'SUPPORT_TICKET',
    )!;
    expect([...ticketCall[1]]).toEqual(['TICKET:t1']);
    expect(esc.autoResolveCleared).toHaveBeenCalledWith('REFUND', new Set());
  });

  it('skips auto-resolve for a detector that hit its row cap', async () => {
    (prisma.video.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 1000 }, (_, i) => ({
        id: `v${i}`,
        title: 't',
        section: { courseId: 'c', course: { title: 'x' } },
      })),
    );

    await service.scan();

    expect(
      esc.autoResolveCleared.mock.calls.some(([type]) => type === 'CONTENT'),
    ).toBe(false);
    expect(esc.raise.mock.calls.some(([i]) => i.type === 'CONTENT')).toBe(
      false,
    );
  });

  it('keeps going when one detector throws', async () => {
    (prisma.supportTicket.findMany as jest.Mock).mockRejectedValue(
      new Error('db hiccup'),
    );
    (prisma.video.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'v1',
        title: 'Intro',
        section: { courseId: 'c1', course: { title: 'React' } },
      },
    ]);

    const result = await service.scan();

    expect(result.raised).toBe(1);
  });

  it('sends the alert digest once for everything newly raised', async () => {
    (prisma.video.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'v1',
        title: 'Intro',
        section: { courseId: 'c1', course: { title: 'React' } },
      },
    ]);

    await service.scan();

    expect(esc.notifyRaised).toHaveBeenCalledTimes(1);
    expect(esc.notifyRaised.mock.calls[0][0]).toHaveLength(1);
  });

  it('imports an old trainer flag once, as a TRAINER_FLAG escalation', async () => {
    (prisma.user.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'stu', name: 'Stu', flagReason: 'Absent' }])
      .mockResolvedValueOnce([]);

    await service.scan();

    const flag = esc.raise.mock.calls.find(
      ([i]) => i.type === 'TRAINER_FLAG',
    )![0];
    expect(flag).toMatchObject({
      dedupeKey: 'LEGACY_FLAG:stu',
      studentId: 'stu',
      reason: 'Absent',
    });
  });

  it('does not run two scans at once', async () => {
    let release!: () => void;
    esc.getSettings.mockReturnValue(
      new Promise((r) => (release = () => r(SETTINGS))),
    );

    const first = service.scan();
    const second = await service.scan();
    release();
    await first;

    expect(second.skipped).toBe(true);
  });
});
