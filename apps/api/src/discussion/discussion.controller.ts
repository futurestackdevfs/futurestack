import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DiscussionService } from './discussion.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '@prisma/client';
import { clampPageSize } from '../common/page-size.pipe';

interface RequestUser {
  id: string;
  role: Role;
}

@Controller('discussion')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Auth()
  @Get(':courseId')
  async listMessages(
    @Param('courseId') courseId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.listMessages(
      courseId,
      user.id,
      user.role,
      page ? parseInt(page, 10) : 1,
      clampPageSize(limit, 20, 100),
    );
  }

  @Auth()
  @Post(':courseId')
  async createMessage(
    @Param('courseId') courseId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.createMessage(
      courseId,
      user.id,
      user.role,
      dto,
    );
  }

  @Auth()
  @Patch(':courseId/messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.updateMessage(
      messageId,
      user.id,
      user.role,
      dto,
    );
  }

  @Auth()
  @Delete(':courseId/messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.deleteMessage(messageId, user.id, user.role);
  }

  @Auth()
  @Patch(':courseId/messages/:messageId/pin')
  async pinMessage(@Param('messageId') messageId: string, @Req() req: Request) {
    const user = req.user as RequestUser;
    return this.discussionService.pinMessage(messageId, user.role, user.id);
  }

  @Auth()
  @Patch(':courseId/messages/:messageId/answer')
  async markAnswered(
    @Param('messageId') messageId: string,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.markAnswered(messageId, user.role, user.id);
  }

  @Auth()
  @Post(':courseId/messages/:messageId/replies')
  async createReply(
    @Param('messageId') messageId: string,
    @Body() dto: CreateReplyDto,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.createReply(
      messageId,
      user.id,
      user.role,
      dto,
    );
  }

  @Auth()
  @Delete(':courseId/replies/:replyId')
  async deleteReply(@Param('replyId') replyId: string, @Req() req: Request) {
    const user = req.user as RequestUser;
    return this.discussionService.deleteReply(replyId, user.id, user.role);
  }

  @Auth()
  @Post(':courseId/messages/:messageId/upvote')
  async toggleMessageUpvote(
    @Param('courseId') courseId: string,
    @Param('messageId') messageId: string,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.toggleUpvote(
      user.id,
      user.role,
      courseId,
      messageId,
      undefined,
    );
  }

  @Auth()
  @Post(':courseId/replies/:replyId/upvote')
  async toggleReplyUpvote(
    @Param('courseId') courseId: string,
    @Param('replyId') replyId: string,
    @Req() req: Request,
  ) {
    const user = req.user as RequestUser;
    return this.discussionService.toggleUpvote(
      user.id,
      user.role,
      courseId,
      undefined,
      replyId,
    );
  }
}
