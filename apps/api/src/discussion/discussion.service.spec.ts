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
  let s3: { deleteByUrl: jest.Mock; isOwnUrl: jest.Mock };

  // A course taught by an APPROVED trainer "__spec__trainer-1".
  const approvedTrainerCourse = {
    trainerId: '__spec__trainer-1',
    trainer: { approvalStatus: 'APPROVED' },
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    s3 = { deleteByUrl: jest.fn(), isOwnUrl: jest.fn().mockReturnValue(true) };
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

    it('allows the approved trainer of the course through without checking enrollment', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(approvedTrainerCourse);
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

    it('rejects a trainer who does not teach the course', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        trainerId: '__spec__other-trainer',
        trainer: { approvalStatus: 'APPROVED' },
      });

      await expect(
        service.createMessage('__spec__course-1', '__spec__trainer-1', Role.TRAINER, {
          body: 'hi',
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.courseDiscussion.create).not.toHaveBeenCalled();
    });

    it.each(['PENDING', 'REJECTED', null])(
      'rejects a trainer whose approval status is %s even on their own course',
      async (approvalStatus) => {
        (prisma.course.findUnique as jest.Mock).mockResolvedValue({
          trainerId: '__spec__trainer-1',
          trainer: { approvalStatus },
        });

        await expect(
          service.listMessages('__spec__course-1', '__spec__trainer-1', Role.TRAINER),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.courseDiscussion.findMany).not.toHaveBeenCalled();
      },
    );

    it('rejects a trainer asking for a course that does not exist', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.listMessages('__spec__missing', '__spec__trainer-1', Role.TRAINER),
      ).rejects.toThrow(NotFoundException);
    });

    it.each([Role.SALES, Role.SUPPORT, Role.COORDINATOR])(
      'rejects %s, which has no business in course discussions',
      async (role) => {
        await expect(
          service.listMessages('__spec__course-1', '__spec__staff-1', role),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.createMessage('__spec__course-1', '__spec__staff-1', role, {
            body: 'hi',
          } as any),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.courseDiscussion.findMany).not.toHaveBeenCalled();
        expect(prisma.courseDiscussion.create).not.toHaveBeenCalled();
      },
    );

    it.each([Role.ADMIN, Role.CONTENT_MANAGER])('allows %s into any course', async (role) => {
      (prisma.courseDiscussion.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.listMessages('__spec__course-1', '__spec__staff-1', role),
      ).resolves.toEqual([]);
      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
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

    it('allows a trainer to post an ANNOUNCEMENT in their own course', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(approvedTrainerCourse);
      (prisma.courseDiscussion.create as jest.Mock).mockResolvedValue({ id: '__spec__msg-1' });

      await service.createMessage('__spec__course-1', '__spec__trainer-1', Role.TRAINER, {
        body: 'Important update',
        tag: MessageTag.ANNOUNCEMENT,
      } as any);

      expect(prisma.courseDiscussion.create).toHaveBeenCalled();
    });

    it('rejects a trainer posting an ANNOUNCEMENT in a course they do not teach', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        trainerId: '__spec__other-trainer',
        trainer: { approvalStatus: 'APPROVED' },
      });

      await expect(
        service.createMessage('__spec__course-1', '__spec__trainer-1', Role.TRAINER, {
          body: 'fake announcement',
          tag: MessageTag.ANNOUNCEMENT,
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.courseDiscussion.create).not.toHaveBeenCalled();
    });
  });

  describe('attachmentUrl — only our own discussions/ uploads are accepted', () => {
    beforeEach(() => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });
    });

    it('rejects a foreign attachment URL when posting', async () => {
      s3.isOwnUrl.mockReturnValue(false);

      await expect(
        service.createMessage('__spec__course-1', '__spec__student-1', Role.STUDENT, {
          body: 'hi',
          attachmentUrl: 'https://evil.example/courses/thumb.jpg',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(s3.isOwnUrl).toHaveBeenCalledWith('https://evil.example/courses/thumb.jpg', ['discussions']);
      expect(prisma.courseDiscussion.create).not.toHaveBeenCalled();
    });

    it('accepts an attachment URL from our own discussions/ folder', async () => {
      (prisma.courseDiscussion.create as jest.Mock).mockResolvedValue({ id: '__spec__msg-1' });

      await service.createMessage('__spec__course-1', '__spec__student-1', Role.STUDENT, {
        body: 'hi',
        attachmentUrl: 'https://cdn.example.com/discussions/1-2.png',
      } as any);

      expect(prisma.courseDiscussion.create).toHaveBeenCalled();
    });

    it('rejects a foreign attachment URL when editing, and deletes nothing', async () => {
      s3.isOwnUrl.mockReturnValue(false);
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        authorId: '__spec__student-1',
        courseId: '__spec__course-1',
        attachmentUrl: 'https://cdn.example.com/discussions/old.png',
      });

      await expect(
        service.updateMessage('__spec__msg-1', '__spec__student-1', Role.STUDENT, {
          attachmentUrl: 'https://evil.example/courses/thumb.jpg',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(s3.deleteByUrl).not.toHaveBeenCalled();
      expect(prisma.courseDiscussion.update).not.toHaveBeenCalled();
    });

    it('rejects a trainer turning a message into an ANNOUNCEMENT in a course they do not teach', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__msg-1',
        authorId: '__spec__trainer-1',
        courseId: '__spec__course-1',
        attachmentUrl: null,
      });
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        trainerId: '__spec__other-trainer',
        trainer: { approvalStatus: 'APPROVED' },
      });

      await expect(
        service.updateMessage('__spec__msg-1', '__spec__trainer-1', Role.TRAINER, {
          tag: MessageTag.ANNOUNCEMENT,
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.courseDiscussion.update).not.toHaveBeenCalled();
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
      // deletion is scoped to the discussions/ folder
      expect(s3.deleteByUrl).toHaveBeenCalledWith('https://cdn.example.com/file.pdf', ['discussions']);
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
        trainer: { approvalStatus: 'APPROVED' },
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
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(approvedTrainerCourse);
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
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({ courseId: '__spec__course-1' });
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
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({ courseId: '__spec__course-1' });
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

    it('rejects an upvote when the URL courseId is not the course the message belongs to', async () => {
      // message lives in course B; the caller is enrolled in course A and puts A in the URL
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({ courseId: '__spec__course-B' });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });

      await expect(
        service.toggleUpvote('__spec__student-1', Role.STUDENT, '__spec__course-A', '__spec__msg-in-B'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.discussionUpvote.create).not.toHaveBeenCalled();
      expect(prisma.discussionUpvote.delete).not.toHaveBeenCalled();
    });

    it('rejects an upvote on a reply whose message is in another course', async () => {
      (prisma.courseDiscussionReply.findUnique as jest.Mock).mockResolvedValue({ message: { courseId: '__spec__course-B' } });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });

      await expect(
        service.toggleUpvote('__spec__student-1', Role.STUDENT, '__spec__course-A', undefined, '__spec__reply-in-B'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.discussionUpvote.create).not.toHaveBeenCalled();
    });

    it('checks enrollment against the course the message belongs to, so a student NOT enrolled there is refused', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({ courseId: '__spec__course-1' });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.toggleUpvote('__spec__student-1', Role.STUDENT, '__spec__course-1', '__spec__msg-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: { studentId_courseId: { studentId: '__spec__student-1', courseId: '__spec__course-1' } },
      });
    });

    it('still works without a URL courseId (derives it from the message)', async () => {
      (prisma.courseDiscussion.findUnique as jest.Mock).mockResolvedValue({ courseId: '__spec__course-1' });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });
      (prisma.discussionUpvote.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.discussionUpvote.create as jest.Mock).mockResolvedValue({});
      (prisma.discussionUpvote.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.toggleUpvote('__spec__student-1', Role.STUDENT, undefined, '__spec__msg-1'),
      ).resolves.toEqual({ upvoted: true, upvoteCount: 1 });
    });
  });
});
