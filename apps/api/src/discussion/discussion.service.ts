import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { Role, MessageTag } from '@prisma/client';

@Injectable()
export class DiscussionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private isStaff(role: Role): boolean {
    return role !== Role.STUDENT;
  }

  private async checkCourseAccess(
    courseId: string,
    userId: string,
    role: Role,
  ) {
    if (this.isStaff(role)) return;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: userId, courseId },
      },
    });

    if (!enrollment || enrollment.status !== 'active') {
      throw new ForbiddenException('You are not enrolled in this course.');
    }
  }

  private async checkTrainerCourseOwnership(
    courseId: string,
    role: Role,
    userId: string,
  ) {
    // ADMIN/CONTENT_MANAGER can act in any course. TRAINERs are restricted to
    // the courses they actually teach.
    if (role !== Role.TRAINER) return;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { trainerId: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.trainerId !== userId) {
      throw new ForbiddenException(
        'You can only moderate your own course discussions.',
      );
    }
  }

  async listMessages(
    courseId: string,
    userId: string,
    role: Role,
    page: number = 1,
    limit: number = 20,
  ) {
    await this.checkCourseAccess(courseId, userId, role);

    const skip = (page - 1) * limit;

    const messages = await this.prisma.courseDiscussion.findMany({
      where: { courseId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        _count: {
          select: { replies: true, upvotes: true },
        },
        upvotes: {
          where: { userId },
          select: { id: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
            _count: {
              select: { upvotes: true },
            },
            upvotes: {
              where: { userId },
              select: { id: true },
            },
          },
        },
      },
    });

    return messages.map((msg) => {
      const { authorId: _a, upvotes: _u, _count: _c, replies, ...rest } = msg;
      return {
        ...rest,
        userHasUpvoted: msg.upvotes.length > 0,
        upvoteCount: msg._count.upvotes,
        replyCount: msg._count.replies,
        replies: msg.replies.map((reply) => {
          const {
            authorId: _ra,
            upvotes: _ru,
            _count: _rc,
            ...replyRest
          } = reply;
          return {
            ...replyRest,
            userHasUpvoted: reply.upvotes.length > 0,
            upvoteCount: reply._count.upvotes,
          };
        }),
      };
    });
  }

  async createMessage(
    courseId: string,
    authorId: string,
    role: Role,
    dto: CreateMessageDto,
  ) {
    await this.checkCourseAccess(courseId, authorId, role);

    if (
      dto.tag === MessageTag.ANNOUNCEMENT &&
      !['TRAINER', 'ADMIN', 'CONTENT_MANAGER'].includes(role)
    ) {
      throw new ForbiddenException('Only staff can post announcements.');
    }

    const message = await this.prisma.courseDiscussion.create({
      data: {
        courseId,
        authorId,
        body: dto.body,
        tag: dto.tag || MessageTag.DOUBT,
        attachmentUrl: dto.attachmentUrl,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });

    return message;
  }

  async updateMessage(
    messageId: string,
    userId: string,
    role: Role,
    dto: UpdateMessageDto,
  ) {
    const message = await this.prisma.courseDiscussion.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    const isAuthor = message.authorId === userId;
    const isAdminOrManager = ['ADMIN', 'CONTENT_MANAGER'].includes(role);

    if (!isAuthor && !isAdminOrManager) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    if (
      dto.tag === MessageTag.ANNOUNCEMENT &&
      !['TRAINER', 'ADMIN', 'CONTENT_MANAGER'].includes(role)
    ) {
      throw new ForbiddenException('Only staff can post announcements.');
    }

    // Delete old attachment from S3 if replaced
    if (dto.attachmentUrl && dto.attachmentUrl !== message.attachmentUrl && message.attachmentUrl) {
      try { await this.s3Service.deleteByUrl(message.attachmentUrl); } catch {}
    }

    return this.prisma.courseDiscussion.update({
      where: { id: messageId },
      data: {
        body: dto.body,
        tag: dto.tag,
        attachmentUrl: dto.attachmentUrl,
      },
    });
  }

  async deleteMessage(messageId: string, userId: string, role: Role) {
    const message = await this.prisma.courseDiscussion.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    const isAuthor = message.authorId === userId;
    const isAdminOrManager = ['ADMIN', 'CONTENT_MANAGER'].includes(role);

    if (!isAuthor && !isAdminOrManager) {
      throw new ForbiddenException(
        'You do not have permission to delete this message.',
      );
    }

    // Delete attachment from S3 if present
    if (message.attachmentUrl) {
      try { await this.s3Service.deleteByUrl(message.attachmentUrl); } catch {}
    }

    return this.prisma.courseDiscussion.delete({
      where: { id: messageId },
    });
  }

  async pinMessage(messageId: string, role: Role, userId: string) {
    if (!['TRAINER', 'ADMIN', 'CONTENT_MANAGER'].includes(role)) {
      throw new ForbiddenException('Only staff can pin messages.');
    }

    const message = await this.prisma.courseDiscussion.findUnique({
      where: { id: messageId },
      select: { id: true, isPinned: true, courseId: true },
    });
    if (!message) throw new NotFoundException('Message not found');

    await this.checkTrainerCourseOwnership(message.courseId, role, userId);

    return this.prisma.courseDiscussion.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
    });
  }

  async markAnswered(messageId: string, role: Role, userId: string) {
    if (!['TRAINER', 'ADMIN', 'CONTENT_MANAGER'].includes(role)) {
      throw new ForbiddenException('Only staff can mark messages as answered.');
    }

    const message = await this.prisma.courseDiscussion.findUnique({
      where: { id: messageId },
      select: { id: true, isAnswered: true, courseId: true },
    });
    if (!message) throw new NotFoundException('Message not found');

    await this.checkTrainerCourseOwnership(message.courseId, role, userId);

    return this.prisma.courseDiscussion.update({
      where: { id: messageId },
      data: { isAnswered: !message.isAnswered },
    });
  }

  async createReply(
    messageId: string,
    authorId: string,
    role: Role,
    dto: CreateReplyDto,
  ) {
    const message = await this.prisma.courseDiscussion.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    await this.checkCourseAccess(message.courseId, authorId, role);

    return this.prisma.courseDiscussionReply.create({
      data: {
        messageId,
        authorId,
        body: dto.body,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });
  }

  async deleteReply(replyId: string, userId: string, role: Role) {
    const reply = await this.prisma.courseDiscussionReply.findUnique({
      where: { id: replyId },
    });
    if (!reply) throw new NotFoundException('Reply not found');

    const isAuthor = reply.authorId === userId;
    const isAdminOrManager = ['ADMIN', 'CONTENT_MANAGER'].includes(role);

    if (!isAuthor && !isAdminOrManager) {
      throw new ForbiddenException(
        'You do not have permission to delete this reply.',
      );
    }

    return this.prisma.courseDiscussionReply.delete({
      where: { id: replyId },
    });
  }

  async toggleUpvote(
    userId: string,
    role: Role,
    courseId?: string,
    messageId?: string,
    replyId?: string,
  ) {
    if ((messageId && replyId) || (!messageId && !replyId)) {
      throw new BadRequestException(
        'Provide exactly one of messageId or replyId',
      );
    }

    let targetCourseId = courseId;
    if (!targetCourseId) {
      const where = messageId ? { messageId } : { replyId };
      const target = messageId
        ? await this.prisma.courseDiscussion.findUnique({
            where: { id: messageId },
            select: { courseId: true },
          })
        : await this.prisma.courseDiscussionReply.findUnique({
            where: { id: replyId },
            select: { message: { select: { courseId: true } } },
          });
      if (!target) throw new NotFoundException('Discussion item not found');
      targetCourseId = messageId
        ? (target as { courseId: string }).courseId
        : (target as { message: { courseId: string } }).message.courseId;
    }

    await this.checkCourseAccess(targetCourseId, userId, role);

    const existingUpvote = await this.prisma.discussionUpvote.findFirst({
      where: {
        userId,
        messageId: messageId || null,
        replyId: replyId || null,
      },
    });

    if (existingUpvote) {
      await this.prisma.discussionUpvote.delete({
        where: { id: existingUpvote.id },
      });
    } else {
      await this.prisma.discussionUpvote.create({
        data: {
          userId,
          messageId: messageId || null,
          replyId: replyId || null,
        },
      });
    }

    const upvoteCount = await this.prisma.discussionUpvote.count({
      where: messageId ? { messageId } : { replyId },
    });

    return {
      upvoted: !existingUpvote,
      upvoteCount,
    };
  }
}
