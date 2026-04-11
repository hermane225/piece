import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatPaginationDto } from './dto/chat-pagination.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createConversation(currentUserId: string, dto: CreateConversationDto) {
    const allParticipantIds = [...new Set([currentUserId, ...dto.participantIds])];

    const usersCount = await this.prisma.user.count({
      where: { id: { in: allParticipantIds } },
    });

    if (usersCount !== allParticipantIds.length) {
      throw new NotFoundException('Un ou plusieurs utilisateurs sont introuvables');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: allParticipantIds.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, city: true },
            },
          },
        },
      },
    });

    return {
      message: 'Conversation créée avec succès',
      conversation,
    };
  }

  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, city: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
    });

    return conversations.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.messages[0] ?? null,
      messages: undefined,
    }));
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    pagination: ChatPaginationDto,
  ) {
    await this.ensureUserIsParticipant(conversationId, userId);

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true, city: true },
          },
        },
      }),
      this.prisma.chatMessage.count({ where: { conversationId } }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const participants = await this.ensureUserIsParticipant(conversationId, userId);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, city: true },
        },
      },
    });

    const targetUserIds = participants
      .map((participant) => participant.userId)
      .filter((participantUserId) => participantUserId !== userId);

    if (targetUserIds.length) {
      await this.notificationsService.createForManyUsers({
        userIds: targetUserIds,
        type: NotificationType.CHAT_MESSAGE,
        title: 'Nouveau message',
        body: `${message.sender.name} vous a envoyé un message`,
        data: {
          conversationId,
          messageId: message.id,
          senderId: userId,
          preview: dto.content.slice(0, 120),
        },
      });
    }

    return {
      message: 'Message envoyé',
      data: message,
    };
  }

  async markMessagesAsRead(userId: string, conversationId: string) {
    await this.ensureUserIsParticipant(conversationId, userId);

    const result = await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return {
      message: 'Messages marqués comme lus',
      updatedCount: result.count,
    };
  }

  private async ensureUserIsParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('Accès interdit à cette conversation');
    }

    return conversation.participants;
  }
}
