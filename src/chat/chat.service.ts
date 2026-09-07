import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../common/dto/pagination.dto';
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
    let postContext: {
      id: string;
      title: string;
      userId: string;
    } | null = null;

    if (dto.postId) {
      postContext = await this.prisma.post.findUnique({
        where: { id: dto.postId },
        select: { id: true, title: true, userId: true },
      });

      if (!postContext) {
        throw new NotFoundException('Annonce non trouvée');
      }
    }

    const participantCandidates = [
      ...(dto.participantIds ?? []),
      dto.participantId,
      dto.userId,
      postContext?.userId,
    ].filter((value): value is string => Boolean(value));

    if (!participantCandidates.length) {
      throw new BadRequestException(
        'Veuillez fournir participantIds[] ou participantId ou userId',
      );
    }

    const allParticipantIds = [
      ...new Set([currentUserId, ...participantCandidates]),
    ];
    const otherParticipantIds = allParticipantIds.filter(
      (id) => id !== currentUserId,
    );

    const usersCount = await this.prisma.user.count({
      where: { id: { in: allParticipantIds } },
    });

    if (usersCount !== allParticipantIds.length) {
      throw new NotFoundException(
        'Un ou plusieurs utilisateurs sont introuvables',
      );
    }

    let conversation: {
      id: string;
      postId: string | null;
      createdAt: Date;
      updatedAt: Date;
      participants: Array<{
        id: string;
        userId: string;
        conversationId: string;
        createdAt: Date;
        user: { id: string; name: string; email: string; city: string };
      }>;
    } | null = null;

    // Un fil de discussion distinct par annonce, même avec le même
    // interlocuteur : on ne réutilise une conversation existante que si elle
    // porte sur la même annonce (postId === dto.postId, y compris "aucune
    // annonce" pour les conversations génériques).
    if (otherParticipantIds.length === 1) {
      const targetUserId = otherParticipantIds[0];
      conversation = await this.prisma.conversation.findFirst({
        where: {
          postId: dto.postId ?? null,
          AND: [
            { participants: { some: { userId: currentUserId } } },
            { participants: { some: { userId: targetUserId } } },
            {
              participants: {
                every: {
                  userId: {
                    in: [currentUserId, targetUserId],
                  },
                },
              },
            },
          ],
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
    }

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          postId: dto.postId ?? null,
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
    }

    let messageResult:
      | {
          message: string;
          data: {
            id: string;
            senderId: string;
            conversationId: string;
            content: string;
            createdAt: Date;
            readAt: Date | null;
            sender: {
              id: string;
              name: string;
              email: string;
              city: string;
            };
          };
        }
      | undefined;

    const cleanedInitialMessage = dto.initialMessage?.trim();
    let messageToSend = cleanedInitialMessage;

    if (postContext?.title && messageToSend) {
      messageToSend = `[Annonce: ${postContext.title}] ${messageToSend}`;
    } else if (postContext?.title && !messageToSend) {
      messageToSend = `Bonjour, je suis interesse par votre annonce: ${postContext.title}`;
    }

    if (messageToSend) {
      messageResult = await this.sendMessage(currentUserId, conversation.id, {
        content: messageToSend,
      });
    }

    return {
      message: 'Conversation prête',
      conversation,
      initialMessage: messageResult?.data,
    };
  }

  async getMyConversations(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {
      participants: {
        some: { userId },
      },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
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
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations.map((conversation) => ({
        ...conversation,
        lastMessage: conversation.messages[0] ?? null,
        messages: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    await this.ensureUserIsParticipant(conversationId, userId);

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

    // Fait remonter la conversation en tête de liste (triée par
    // updatedAt desc) dès qu'un nouveau message y est envoyé.
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const otherParticipants =
      await this.prisma.conversationParticipant.findMany({
        where: { conversationId, userId: { not: userId } },
        select: { userId: true },
      });
    const targetUserIds = otherParticipants.map(
      (participant) => participant.userId,
    );

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

  private async ensureUserIsParticipant(
    conversationId: string,
    userId: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true },
    });

    if (participant) {
      return;
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    throw new ForbiddenException('Accès interdit à cette conversation');
  }
}
