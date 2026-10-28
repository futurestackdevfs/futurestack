import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscalationsService } from './escalations.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// Fully mocked PrismaService / MailService — no live DB or mail connection is opened.
function makePrismaMock() {
  return {
    escalation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    escalationEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    escalationSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    supportTicket: { findUnique: jest.fn() },
    course: { findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

const SETTINGS = {
  id: '__spec__settings',
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

function makeEscalation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '__spec__esc-1',
    number: 7,
    type: 'SUPPORT_TICKET',
    severity: 'MEDIUM',
    status: 'OPEN',
    title: 'Ticket unanswered',
    reason: 'because',
    dedupeKey: 'TICKET:t1',
    autoRaised: true,
    studentId: '__spec__student-1',
    createdById: null,
    assigneeId: null,
    orderId: null,
    ticketId: 't1',
    refundId: null,
    courseId: null,
    videoId: null,
    dueAt: null,
    resolution: null,
    resolvedAt: null,
    createdAt: new Date('2026-10-20T00:00:00Z'),
    updatedAt: new Date('2026-10-20T00:00:00Z'),
    ...overrides,
  };
}

describe('EscalationsService', () => {
  let service: EscalationsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mail: {
    sendEscalationDigestEmail: jest.Mock;
    getPrimaryInboxAddress: jest.Mock;
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    (prisma.escalationSettings.findFirst as jest.Mock).mockResolvedValue(
      SETTINGS,
    );
    mail = {
      sendEscalationDigestEmail: jest.fn().mockResolvedValue(undefined),
      getPrimaryInboxAddress: jest.fn().mockReturnValue('inbox@example.com'),
    };
    service = new EscalationsService(
      prisma,
      mail as unknown as MailService,
      {
        get: jest.fn().mockReturnValue('https://app.example.com'),
      } as unknown as ConfigService,
    );
  });

  describe('raise()', () => {
    const input = {
      type: 'SUPPORT_TICKET' as const,
      severity: 'MEDIUM' as const,
      title: 'Ticket unanswered',
      reason: 'because',
      dedupeKey: 'TICKET:t1',
      autoRaised: true,
    };

    it('creates a new escalation with a resolve-by time and a CREATED event', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.escalation.create as jest.Mock).mockResolvedValue(
        makeEscalation(),
      );

      const { raised } = await service.raise(input);

      expect(raised).toBe(true);
      const data = (prisma.escalation.create as jest.Mock).mock.calls[0][0]
        .data;
      expect(data.dedupeKey).toBe('TICKET:t1');
      expect(data.dueAt).toBeInstanceOf(Date);
      expect(data.events.create.action).toBe('CREATED');
    });

    it('does not raise the same problem twice', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(
        makeEscalation(),
      );

      const { raised } = await service.raise(input);

      expect(raised).toBe(false);
      expect(prisma.escalation.create).not.toHaveBeenCalled();
      expect(prisma.escalation.update).not.toHaveBeenCalled();
    });

    it('makes an existing active escalation more severe when the problem got worse', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(
        makeEscalation({ severity: 'MEDIUM' }),
      );
      (prisma.escalation.update as jest.Mock).mockResolvedValue(
        makeEscalation({ severity: 'HIGH' }),
      );

      const { raised } = await service.raise({ ...input, severity: 'HIGH' });

      expect(raised).toBe(false);
      expect(
        (prisma.escalation.update as jest.Mock).mock.calls[0][0].data.severity,
      ).toBe('HIGH');
    });

    it('never lowers the severity of an existing escalation', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(
        makeEscalation({ severity: 'CRITICAL' }),
      );

      await service.raise({ ...input, severity: 'MEDIUM' });

      expect(prisma.escalation.update).not.toHaveBeenCalled();
    });

    it('re-opens an escalation the system auto-resolved when the problem comes back', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(
        makeEscalation({ status: 'RESOLVED', resolvedAt: new Date() }),
      );
      (prisma.escalationEvent.findFirst as jest.Mock).mockResolvedValue({
        action: 'AUTO_RESOLVED',
      });
      (prisma.escalation.update as jest.Mock).mockResolvedValue(
        makeEscalation(),
      );

      const { raised } = await service.raise(input);

      expect(raised).toBe(true);
      expect(
        (prisma.escalation.update as jest.Mock).mock.calls[0][0].data.status,
      ).toBe('OPEN');
    });

    it('leaves an escalation a person closed alone', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(
        makeEscalation({ status: 'DISMISSED', resolvedAt: new Date() }),
      );

      const { raised } = await service.raise(input);

      expect(raised).toBe(false);
      expect(prisma.escalation.update).not.toHaveBeenCalled();
    });
  });

  describe('autoResolveCleared()', () => {
    it('closes active auto-raised escalations whose problem is gone, and only those', async () => {
      (prisma.escalation.findMany as jest.Mock).mockResolvedValue([
        { id: 'a', dedupeKey: 'TICKET:a' },
        { id: 'b', dedupeKey: 'TICKET:b' },
      ]);

      const closed = await service.autoResolveCleared(
        'SUPPORT_TICKET',
        new Set(['TICKET:a']),
      );

      expect(closed).toBe(1);
      expect(
        (prisma.escalation.updateMany as jest.Mock).mock.calls[0][0].where,
      ).toEqual({ id: { in: ['b'] } });
      expect(
        (prisma.escalationEvent.createMany as jest.Mock).mock.calls[0][0]
          .data[0].action,
      ).toBe('AUTO_RESOLVED');
    });

    it('does nothing when every problem is still present', async () => {
      (prisma.escalation.findMany as jest.Mock).mockResolvedValue([
        { id: 'a', dedupeKey: 'TICKET:a' },
      ]);

      expect(
        await service.autoResolveCleared(
          'SUPPORT_TICKET',
          new Set(['TICKET:a']),
        ),
      ).toBe(0);
      expect(prisma.escalation.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    const actor = { id: '__spec__admin', name: 'Admin' };

    beforeEach(() => {
      (prisma.escalation.findUnique as jest.Mock).mockImplementation(
        async (args: any) =>
          args.include
            ? {
                ...makeEscalation(),
                events: [],
                student: null,
                assignee: null,
                createdBy: null,
              }
            : makeEscalation(),
      );
    });

    it('refuses to resolve without a resolution note', async () => {
      await expect(
        service.update('__spec__esc-1', { status: 'RESOLVED' }, actor),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.escalation.update).not.toHaveBeenCalled();
    });

    it('resolves with a note, stamping resolvedAt and logging the change', async () => {
      await service.update(
        '__spec__esc-1',
        { status: 'RESOLVED', resolution: 'Fixed it' },
        actor,
      );

      const data = (prisma.escalation.update as jest.Mock).mock.calls[0][0]
        .data;
      expect(data.status).toBe('RESOLVED');
      expect(data.resolution).toBe('Fixed it');
      expect(data.resolvedAt).toBeInstanceOf(Date);
      expect(data.events.create[0].action).toBe('STATUS');
    });

    it('moves OPEN to ASSIGNED when someone is assigned', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__staff',
        name: 'Sam',
        role: 'SUPPORT',
        isActive: true,
      });

      await service.update(
        '__spec__esc-1',
        { assigneeId: '__spec__staff' },
        actor,
      );

      const data = (prisma.escalation.update as jest.Mock).mock.calls[0][0]
        .data;
      expect(data.status).toBe('ASSIGNED');
      expect(data.assignee).toEqual({ connect: { id: '__spec__staff' } });
    });

    it('rejects assigning to someone who is not staff', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'x',
        name: 'Stu',
        role: 'STUDENT',
        isActive: true,
      });

      await expect(
        service.update('__spec__esc-1', { assigneeId: 'x' }, actor),
      ).rejects.toThrow(/cannot be assigned/);
    });

    it('404s for an unknown escalation', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('nope', { severity: 'HIGH' }, actor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('flagStudent()', () => {
    const actor = { id: '__spec__trainer', name: 'Tina' };

    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__student-1',
        name: 'Stu',
        role: 'STUDENT',
      });
    });

    it('raises a TRAINER_FLAG escalation and sets the trainer-console badge', async () => {
      (prisma.escalation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.escalation.create as jest.Mock).mockResolvedValue(
        makeEscalation({ type: 'TRAINER_FLAG', dedupeKey: null }),
      );

      await service.flagStudent('__spec__student-1', 'Not attending', actor);

      const data = (prisma.escalation.create as jest.Mock).mock.calls[0][0]
        .data;
      expect(data.type).toBe('TRAINER_FLAG');
      expect(data.reason).toBe('Not attending');
      expect((prisma.user.update as jest.Mock).mock.calls[0][0].data).toEqual({
        flaggedToCoordinator: true,
        flagReason: 'Not attending',
      });
    });

    it('adds to the existing flag instead of raising a second one', async () => {
      (prisma.escalation.findFirst as jest.Mock).mockResolvedValue(
        makeEscalation({ type: 'TRAINER_FLAG' }),
      );
      (prisma.escalation.update as jest.Mock).mockResolvedValue(
        makeEscalation(),
      );

      await service.flagStudent('__spec__student-1', 'Still absent', actor);

      expect(prisma.escalation.create).not.toHaveBeenCalled();
      expect(
        (prisma.escalation.update as jest.Mock).mock.calls[0][0].data.events
          .create.action,
      ).toBe('COMMENT');
    });

    it('rejects a non-student', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'x',
        name: 'T',
        role: 'TRAINER',
      });
      await expect(service.flagStudent('x', null, actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyRaised()', () => {
    it('sends one digest for HIGH / CRITICAL escalations only', async () => {
      await service.notifyRaised([
        makeEscalation({ severity: 'LOW' }),
        makeEscalation({ severity: 'CRITICAL', number: 8 }),
        makeEscalation({ severity: 'HIGH', number: 9 }),
      ] as never);

      expect(mail.sendEscalationDigestEmail).toHaveBeenCalledTimes(1);
      const [to, data] = mail.sendEscalationDigestEmail.mock.calls[0];
      expect(to).toBe('inbox@example.com');
      expect(data.total).toBe(2);
      expect(data.items[0].severity).toBe('CRITICAL');
      expect(data.url).toBe(
        'https://app.example.com/ops/admin?view=escalations',
      );
    });

    it('stays quiet when nothing urgent was raised or alerts are off', async () => {
      await service.notifyRaised([
        makeEscalation({ severity: 'MEDIUM' }),
      ] as never);
      expect(mail.sendEscalationDigestEmail).not.toHaveBeenCalled();

      (prisma.escalationSettings.findFirst as jest.Mock).mockResolvedValue({
        ...SETTINGS,
        alertsEnabled: false,
      });
      await service.notifyRaised([
        makeEscalation({ severity: 'CRITICAL' }),
      ] as never);
      expect(mail.sendEscalationDigestEmail).not.toHaveBeenCalled();
    });

    it('never throws if the email fails', async () => {
      mail.sendEscalationDigestEmail.mockRejectedValue(new Error('smtp down'));
      await expect(
        service.notifyRaised([
          makeEscalation({ severity: 'CRITICAL' }),
        ] as never),
      ).resolves.toBeUndefined();
    });
  });

  describe('bulk()', () => {
    const actor = { id: '__spec__admin' };

    it('requires a note to resolve in bulk', async () => {
      await expect(
        service.bulk({ ids: ['a'], action: 'RESOLVE' }, actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires an assignee to assign in bulk', async () => {
      await expect(
        service.bulk({ ids: ['a'], action: 'ASSIGN' }, actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('reports which ones failed without stopping the rest', async () => {
      (prisma.escalation.findUnique as jest.Mock).mockImplementation(
        async (args: any) => {
          if (args.where.id === 'missing') return null;
          return args.include
            ? { ...makeEscalation(), events: [] }
            : makeEscalation();
        },
      );

      const result = await service.bulk(
        { ids: ['ok', 'missing'], action: 'DISMISS' },
        actor,
      );

      expect(result.done).toBe(1);
      expect(result.failed).toEqual([
        { id: 'missing', message: 'Escalation not found' },
      ]);
    });
  });
});
