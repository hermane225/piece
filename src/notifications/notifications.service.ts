import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { NotificationsBusService } from './notifications-bus.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsBusService: NotificationsBusService,
  ) {}

  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }) {
    const { userId, type, title, body, data } = params;

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data,
      },
    });

    await this.notificationsBusService.publish({ userId, notification });

    return notification;
  }

  async createForManyUsers(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }) {
    const uniqueUserIds = [...new Set(params.userIds)].filter(Boolean);
    if (!uniqueUserIds.length) return { count: 0 };

    const createdNotifications = await Promise.all(
      uniqueUserIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type: params.type,
            title: params.title,
            body: params.body,
            data: params.data,
          },
        }),
      ),
    );

    await Promise.all(
      createdNotifications.map((notification) =>
        this.notificationsBusService.publish({
          userId: notification.userId,
          notification,
        }),
      ),
    );

    return { count: createdNotifications.length };
  }

  async getMyNotifications(userId: string, filters: FilterNotificationsDto) {
    const { page = 1, limit = 10, isRead } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };
    if (typeof isRead === 'string') {
      where.isRead = isRead === 'true';
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, isRead: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification non trouvée');
    }

    if (notification.isRead) {
      return { message: 'Notification déjà lue' };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: 'Notification marquée comme lue' };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'Notifications marquées comme lues',
      updatedCount: result.count,
    };
  }
}
