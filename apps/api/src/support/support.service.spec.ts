import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';

// Fully mocked PrismaService / MailService / ConfigService / AuthService — no
// live DB connection or real email send happens anywhere in this file.
function makePrismaMock() {
  return {
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    escalationSettings: { findFirst: jest.fn() },
    supportTicketMessage: { findMany: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
  } as unknown as PrismaService;
}

function makeTicketRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__ticket-1',
    number: 42,
    subject: '__spec__ Cannot access video',
    category: 'TECHNICAL',
    topic: null,
    context: null,
    priority: 'NORMAL',
    status: 'OPEN',
    studentId: '__spec__student-1',
    assigneeId: null,
    student: { id: '__spec__student-1', name: '__spec__ Student', email: 'student@example.com', avatarUrl: null },
    assignee: null,
    messages: [],
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    lastMessageAt: new Date('2026-09-01T00:00:00Z'),
    resolvedAt: null,
    closedAt: null,
    closedReason: null,
    ...overrides,
  };
}

describe('SupportService', () => {
  let service: SupportService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mail: Record<string, jest.Mock>;
  let config: { get: jest.Mock };
  let authService: { forgotPassword: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    mail = {
      sendTicketOpenedEmail: jest.fn().mockResolvedValue(undefined),
      sendAgentNewTicketEmail: jest.fn().mockResolvedValue(undefined),
      sendTicketReplyEmail: jest.fn().mockResolvedValue(undefined),
      sendTicketResolvedEmail: jest.fn().mockResolvedValue(undefined),
      getPrimaryInboxAddress: jest.fn().mockReturnValue('support@example.com'),
      listInboxThreads: jest.fn(),
      getInboxThread: jest.fn(),
      replyInInboxThread: jest.fn(),
    };
    config = { get: jest.fn().mockReturnValue('http://localhost:3000') };
    authService = { forgotPassword: jest.fn().mockResolvedValue({ message: 'ok' }) };

    service = new SupportService(
      prisma,
      mail as any,
      config as any,
      authService as any,
    );
  });

  describe('createTicket()', () => {
    it('creates a ticket with an initial message and notifies student + agent inbox', async () => {
      (prisma.supportTicket.create as jest.Mock).mockResolvedValue(makeTicketRow());

      const result = await service.createTicket(
        { id: '__spec__student-1', role: Role.STUDENT },
        {
          subject: '  Cannot access video  ',
          category: 'TECHNICAL',
          body: 'Video will not play',
        } as any,
      );

      expect(result.ref).toBe('FS-SUP-00042');
      expect(result.status).toBe('OPEN');
      // notify happens fire-and-forget; give the microtask queue a tick
      await Promise.resolve();
      expect(mail.sendTicketOpenedEmail).toHaveBeenCalled();
      expect(mail.sendAgentNewTicketEmail).toHaveBeenCalled();
    });
  });

  describe('getOwnedTicketOr403() (via getThread/closeOwn)', () => {
    it('rejects a student accessing someone else\'s ticket', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ studentId: '__spec__other-student' }),
      );

      await expect(
        service.getThread('__spec__ticket-1', { id: '__spec__student-1', role: Role.STUDENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an agent (SUPPORT/ADMIN) to access any ticket', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ studentId: '__spec__other-student' }),
      );
      (prisma.supportTicketMessage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getThread('__spec__ticket-1', {
        id: '__spec__agent-1',
        role: Role.ADMIN,
      });
      expect(result.id).toBe('__spec__ticket-1');
    });

    it('hides internal notes from the student view but not from the agent view', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(makeTicketRow());
      (prisma.supportTicketMessage.findMany as jest.Mock).mockResolvedValue([]);

      await service.getThread('__spec__ticket-1', { id: '__spec__student-1', role: Role.STUDENT });

      expect(prisma.supportTicketMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isInternalNote: false }),
        }),
      );
    });

    it('throws NotFoundException for a nonexistent ticket', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getThread('__spec__missing', { id: '__spec__student-1', role: Role.STUDENT }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addStudentMessage()', () => {
    it('rejects adding a message to a CLOSED ticket', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ status: 'CLOSED' }),
      );

      await expect(
        service.addStudentMessage(
          '__spec__ticket-1',
          { id: '__spec__student-1', role: Role.STUDENT },
          { body: 'still broken' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('reopens a RESOLVED ticket to OPEN when the student replies', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ status: 'RESOLVED' }),
      );
      (prisma.supportTicketMessage.create as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        body: 'still broken',
        attachmentUrl: null,
        isInternalNote: false,
        createdAt: new Date(),
        author: { id: '__spec__student-1', name: 'Student', role: Role.STUDENT, avatarUrl: null },
      });
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue({});

      await service.addStudentMessage(
        '__spec__ticket-1',
        { id: '__spec__student-1', role: Role.STUDENT },
        { body: 'still broken' } as any,
      );

      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: '__spec__ticket-1' },
        data: expect.objectContaining({ status: 'OPEN' }),
      });
    });
  });

  describe('staffAddMessage() — unassigned-ticket auto-claim', () => {
    it('claims an unassigned ticket for whichever agent replies first (public reply)', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ assigneeId: null }),
      );
      (prisma.supportTicketMessage.create as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        body: 'We are looking into it',
        attachmentUrl: null,
        isInternalNote: false,
        createdAt: new Date(),
        author: { id: '__spec__agent-1', name: 'Agent', role: Role.SUPPORT, avatarUrl: null },
      });
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue({});

      await service.staffAddMessage(
        '__spec__ticket-1',
        { id: '__spec__agent-1', role: Role.SUPPORT },
        { body: 'We are looking into it', isInternalNote: false } as any,
      );

      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: '__spec__ticket-1' },
        data: expect.objectContaining({ assigneeId: '__spec__agent-1', status: 'PENDING' }),
      });
    });

    it('does not overwrite an existing assignee when a second agent replies', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ assigneeId: '__spec__agent-original' }),
      );
      (prisma.supportTicketMessage.create as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        body: 'Following up',
        attachmentUrl: null,
        isInternalNote: false,
        createdAt: new Date(),
        author: { id: '__spec__agent-2', name: 'Agent 2', role: Role.SUPPORT, avatarUrl: null },
      });
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue({});

      await service.staffAddMessage(
        '__spec__ticket-1',
        { id: '__spec__agent-2', role: Role.SUPPORT },
        { body: 'Following up', isInternalNote: false } as any,
      );

      const callArgs = (prisma.supportTicket.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('assigneeId');
    });

    it('an internal note also claims an unassigned ticket, but does not notify the student', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ assigneeId: null }),
      );
      (prisma.supportTicketMessage.create as jest.Mock).mockResolvedValue({
        id: '__spec__msg-2',
        body: 'Internal note',
        attachmentUrl: null,
        isInternalNote: true,
        createdAt: new Date(),
        author: { id: '__spec__agent-1', name: 'Agent', role: Role.SUPPORT, avatarUrl: null },
      });
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue({});

      await service.staffAddMessage(
        '__spec__ticket-1',
        { id: '__spec__agent-1', role: Role.SUPPORT },
        { body: 'Internal note', isInternalNote: true } as any,
      );

      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: '__spec__ticket-1' },
        data: { assigneeId: '__spec__agent-1' },
      });
      expect(mail.sendTicketReplyEmail).not.toHaveBeenCalled();
    });
  });

  describe('staffUpdate()', () => {
    it('sets resolvedAt when status moves to RESOLVED and emails the student', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(makeTicketRow());
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue(
        makeTicketRow({ status: 'RESOLVED' }),
      );

      await service.staffUpdate('__spec__ticket-1', { status: 'RESOLVED' } as any);

      const callArgs = (prisma.supportTicket.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.status).toBe('RESOLVED');
      expect(callArgs.data.resolvedAt).toBeInstanceOf(Date);
      await Promise.resolve();
      expect(mail.sendTicketResolvedEmail).toHaveBeenCalled();
    });

    it('clears resolvedAt/closedAt when re-opening a ticket back to OPEN', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(
        makeTicketRow({ status: 'RESOLVED', resolvedAt: new Date() }),
      );
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'OPEN' }));

      await service.staffUpdate('__spec__ticket-1', { status: 'OPEN' } as any);

      const callArgs = (prisma.supportTicket.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.resolvedAt).toBeNull();
      expect(callArgs.data.closedAt).toBeNull();
    });
  });

  describe('sendStudentPasswordReset()', () => {
    it('throws 404 for a non-student user id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__trainer-1',
        email: 'trainer@example.com',
        role: Role.TRAINER,
      });

      await expect(
        service.sendStudentPasswordReset('__spec__trainer-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('delegates to AuthService.forgotPassword with the student\'s email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__student-1',
        email: 'student@example.com',
        role: Role.STUDENT,
      });

      const result = await service.sendStudentPasswordReset('__spec__student-1');

      expect(authService.forgotPassword).toHaveBeenCalledWith('student@example.com');
      expect(result).toEqual({ sent: true, email: 'student@example.com' });
    });
  });

  describe('autoCloseIdleTickets()', () => {
    const now = new Date('2026-10-28T12:00:00Z');
    const dayMs = 24 * 60 * 60 * 1000;

    it('closes tickets waiting on the student or resolved, with no message for 3 days by default', async () => {
      (prisma.escalationSettings.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supportTicket.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const closed = await service.autoCloseIdleTickets(now);

      expect(closed).toBe(2);
      const arg = (prisma.supportTicket.updateMany as jest.Mock).mock.calls[0][0];
      const cutoff = new Date(now.getTime() - 3 * dayMs);
      expect(arg.where.OR).toEqual([
        { status: 'PENDING', lastMessageAt: { lt: cutoff } },
        { status: 'RESOLVED', lastMessageAt: { lt: cutoff }, resolvedAt: { lt: cutoff } },
      ]);
      expect(arg.data).toEqual({ status: 'CLOSED', closedAt: now, closedReason: 'AUTO' });
    });

    it('never touches tickets that are waiting on an agent', async () => {
      (prisma.escalationSettings.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supportTicket.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.autoCloseIdleTickets(now);

      const statuses = (prisma.supportTicket.updateMany as jest.Mock).mock.calls[0][0].where.OR.map(
        (c: { status: string }) => c.status,
      );
      expect(statuses).not.toContain('OPEN');
    });

    it('uses the number of days the admin configured', async () => {
      (prisma.escalationSettings.findFirst as jest.Mock).mockResolvedValue({ ticketAutoCloseDays: 7 });
      (prisma.supportTicket.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.autoCloseIdleTickets(now);

      const cutoff = new Date(now.getTime() - 7 * dayMs);
      expect((prisma.supportTicket.updateMany as jest.Mock).mock.calls[0][0].where.OR[0].lastMessageAt).toEqual({ lt: cutoff });
    });

    it('does not throw if the sweep fails', async () => {
      (prisma.escalationSettings.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supportTicket.updateMany as jest.Mock).mockRejectedValue(new Error('db down'));

      await expect(service.autoCloseIdleTickets(now)).resolves.toBe(0);
    });
  });

  describe('closed reasons', () => {
    it('records that the student closed their own ticket', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(makeTicketRow());
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'CLOSED' }));

      await service.closeOwn('__spec__ticket-1', { id: '__spec__student-1', role: Role.STUDENT } as never);

      expect((prisma.supportTicket.update as jest.Mock).mock.calls[0][0].data.closedReason).toBe('STUDENT');
    });

    it('records an agent closing, and clears everything when an agent reopens', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'PENDING' }));
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'CLOSED' }));
      await service.staffUpdate('__spec__ticket-1', { status: 'CLOSED' });
      expect((prisma.supportTicket.update as jest.Mock).mock.calls[0][0].data).toMatchObject({ closedReason: 'AGENT' });

      (prisma.supportTicket.update as jest.Mock).mockClear();
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'CLOSED', closedReason: 'AUTO' }));
      (prisma.supportTicket.update as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'OPEN' }));
      await service.staffUpdate('__spec__ticket-1', { status: 'OPEN' });
      expect((prisma.supportTicket.update as jest.Mock).mock.calls[0][0].data).toMatchObject({
        status: 'OPEN',
        closedAt: null,
        resolvedAt: null,
        closedReason: null,
      });
    });

    it('tells a student whose ticket was auto-closed to open a new one', async () => {
      (prisma.supportTicket.findUnique as jest.Mock).mockResolvedValue(makeTicketRow({ status: 'CLOSED', closedReason: 'AUTO' }));

      await expect(
        service.addStudentMessage('__spec__ticket-1', { id: '__spec__student-1', role: Role.STUDENT } as never, { body: 'hello' } as never),
      ).rejects.toThrow(/closed automatically/);
    });
  });
});
