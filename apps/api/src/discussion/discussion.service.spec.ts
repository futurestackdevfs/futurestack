import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageTag, Role } from '@prisma/client';
import { DiscussionService } from './discussion.service';
import { PrismaService } from '../prisma/prisma.service';

// Fully mocked PrismaService / S3Service — no live DB connection or real S3
// call is ever made by this file.
function makePrismaMock() {
  return {
    enrollment: { findUnique: jest.fn() },
    course: { findUnique: jest.fn() },
    courseDiscussion: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    courseDiscussionReply: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    discussionUpvote: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('DiscussionService', () => {
  let service: DiscussionService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let s3: { deleteByUrl: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    s3 = { deleteByUrl: jest.fn() };
    service = new DiscussionService(prisma, s3 as any);
  });

  describe('checkCourseAccess (via createMessage) — enrollment gating for students', () => {
    it('rejects a student who is not enrolled in the course', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createMessage(
          '__spec__course-1',
          '__spec__student-1',
          Role.STUDENT,
          { body: 'hi' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a student whose enrollment is not active', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'refunded' });

      await expect(
        service.createMessage(
          '__spec__course-1',
          '__spec__student-1',
          Role.STUDENT,
          { body: 'hi' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a staff role (trainer/admin) through without checking enrollment', async () => {
      (prisma.courseDiscussion.create as jest.Mock).mockResolvedValue({ id: '__spec__msg-1' });

      await service.createMessage(
        '__spec__course-1',
        '__spec__trainer-1',
        Role.TRAINER,
        { body: 'Welcome!' } as any,
      );

      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
      expect(prisma.courseDiscussion.create).toHaveBeenCalled();
    });

    it('allows an enrolled active student to post', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });
      (prisma.courseDiscussion.create as jest.Mock).mockResolvedValue({ id: '__spec__msg-1' });

      await service.createMessage(
        '__spec__course-1',
        '__spec__student-1',
        Role.STUDENT,
        { body: 'question' } as any,
      );

      expect(prisma.courseDiscussion.create).toHaveBeenCalled();
    });
  });

  describe('createMessage() — ANNOUNCEMENT tag is staff-only', () => {
    it('rejects a student trying to post an ANNOUNCEMENT', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });

      await expect(
        service.createMessage('__spec__course-1', '__spec__student-1', Role.STUDENT, {
          body: 'hi',
          tag: MessageTag.ANNOUNCEMENT,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a trainer to post an ANNOUNCEMENT', async () => {
      (prisma.courseDiscussion.create as jest.Mock).mockResolvedValue({ id: '__spec__msg-1' });

      await service.createMessage('__spec__course-1', '__spec__trainer-1', Role.TRAINER, {
        body: 'Important update',
        tag: MessageTag.ANNOUNCEMENT,
      } as any);

      expect(prisma.courseDiscussion.create).toHaveBeenCalled();
    });
  });

  describe('updateMessage() / deleteMessage() — author-or-staff authorization', () => {
    it('rejects a different student editing someone else\'s message', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        authorId: '__spec__other-student',
        attachmentUrl: null,
      });

      await expect(
        service.updateMessage('__spec__msg-1', '__spec__student-1', Role.STUDENT, {
          body: 'edited',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the author to edit their own message', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        authorId: '__spec__student-1',
        attachmentUrl: null,
      });
      (prisma.courseDiscussion.update as jest.Mock).mockResolvedValue({});

      await service.updateMessage('__spec__msg-1', '__spec__student-1', Role.STUDENT, {
        body: 'edited',
      } as any);
      expect(prisma.courseDiscussion.update).toHaveBeenCalled();
    });

    it('allows ADMIN to edit any message even if not the author', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        authorId: '__spec__student-1',
        attachmentUrl: null,
      });
      (prisma.courseDiscussion.update as jest.Mock).mockResolvedValue({});

      await service.updateMessage('__spec__msg-1', '__spec__admin-1', Role.ADMIN, {
        body: 'moderated',
      } as any);
      expect(prisma.courseDiscussion.update).toHaveBeenCalled();
    });

    it('rejects deleting a message that does not exist', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteMessage('__spec__missing', '__spec__student-1', Role.STUDENT),
      ).rejects.toThrow(NotFoundException);
    });

    it('cleans up the S3 attachment when deleting a message that has one', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        authorId: '__spec__student-1',
        attachmentUrl: 'https://cdn.example.com/file.pdf',
      });
      (prisma.courseDiscussion.delete as jest.Mock).mockResolvedValue({});

      await service.deleteMessage('__spec__msg-1', '__spec__student-1', Role.STUDENT);
      expect(s3.deleteByUrl).toHaveBeenCalledWith('https://cdn.example.com/file.pdf');
    });
  });

  describe('pinMessage() / markAnswered() — staff-only + trainer course ownership', () => {
    it('rejects a student trying to pin a message', async () => {
      await expect(
        service.pinMessage('__spec__msg-1', Role.STUDENT, '__spec__student-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a trainer pinning a message in a course they do not own', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        isPinned: false,
        courseId: '__spec__course-1',
      });
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        trainerId: '__spec__other-trainer',
      });

      await expect(
        service.pinMessage('__spec__msg-1', Role.TRAINER, '__spec__trainer-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a trainer to pin a message in their own course, toggling isPinned', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        isPinned: false,
        courseId: '__spec__course-1',
      });
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        trainerId: '__spec__trainer-1',
      });
      (prisma.courseDiscussion.update as jest.Mock).mockResolvedValue({});

      await service.pinMessage('__spec__msg-1', Role.TRAINER, '__spec__trainer-1');

      expect(prisma.courseDiscussion.update).toHaveBeenCalledWith({
        where: { id: '__spec__msg-1' },
        data: { isPinned: true },
      });
    });

    it('allows ADMIN/CONTENT_MANAGER to mark any course\'s message as answered', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        isAnswered: false,
        courseId: '__spec__course-1',
      });
      (prisma.courseDiscussion.update as jest.Mock).mockResolvedValue({});

      await service.markAnswered('__spec__msg-1', Role.ADMIN, '__spec__admin-1');

      // Admin bypasses trainer-ownership check entirely
      expect(prisma.course.findUnique).not.toHaveBeenCalled();
      expect(prisma.courseDiscussion.update).toHaveBeenCalledWith({
        where: { id: '__spec__msg-1' },
        data: { isAnswered: true },
      });
    });
  });

  describe('toggleUpvote()', () => {
    it('rejects when neither messageId nor replyId is given', async () => {
      await expect(
        service.toggleUpvote('__spec__student-1', Role.STUDENT),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when both messageId and replyId are given', async () => {
      await expect(
        service.toggleUpvote(
          '__spec__student-1',
          Role.STUDENT,
          undefined,
          '__spec__msg-1',
          '__spec__reply-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds an upvote when none exists yet', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });
      (prisma.discussionUpvote.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.discussionUpvote.create as jest.Mock).mockResolvedValue({});
      (prisma.discussionUpvote.count as jest.Mock).mockResolvedValue(1);

      const result = await service.toggleUpvote(
        '__spec__student-1',
        Role.STUDENT,
        '__spec__course-1',
        '__spec__msg-1',
      );

      expect(prisma.discussionUpvote.create).toHaveBeenCalled();
      expect(result).toEqual({ upvoted: true, upvoteCount: 1 });
    });

    it('removes an existing upvote (toggle off)', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });
      (prisma.discussionUpvote.findFirst as jest.Mock).mockResolvedValue({ id: '__spec__upvote-1' });
      (prisma.discussionUpvote.delete as jest.Mock).mockResolvedValue({});
      (prisma.discussionUpvote.count as jest.Mock).mockResolvedValue(0);

      const result = await service.toggleUpvote(
        '__spec__student-1',
        Role.STUDENT,
        '__spec__course-1',
        '__spec__msg-1',
      );

      expect(prisma.discussionUpvote.delete).toHaveBeenCalledWith({
        where: { id: '__spec__upvote-1' },
      });
      expect(result).toEqual({ upvoted: false, upvoteCount: 0 });
    });
  });
});
