import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { MarkSoldDto } from './dto/mark-sold.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createFromMarkSold(postId: string, sellerId: string, dto: MarkSoldDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.userId !== sellerId) {
      throw new ForbiddenException(
        'Vous ne pouvez marquer comme vendues que vos propres annonces',
      );
    }

    if (post.status !== 'ACTIVE') {
      throw new BadRequestException('Cette annonce est déjà vendue');
    }

    if (dto.buyerId === sellerId) {
      throw new BadRequestException(
        "L'acheteur doit être différent du vendeur",
      );
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: dto.buyerId },
      select: { id: true },
    });

    if (!buyer) {
      throw new NotFoundException('Acheteur non trouvé');
    }

    const conversationCount = await this.prisma.conversation.count({
      where: {
        AND: [
          { participants: { some: { userId: sellerId } } },
          { participants: { some: { userId: dto.buyerId } } },
        ],
      },
    });

    if (!conversationCount) {
      throw new BadRequestException(
        'Vous devez avoir échangé avec cet acheteur dans le chat avant de marquer la vente',
      );
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.post.updateMany({
        where: { id: postId, status: 'ACTIVE' },
        data: { status: 'SOLD' },
      });

      if (!claimed.count) {
        throw new ConflictException('Cette annonce est déjà vendue');
      }

      return tx.order.create({
        data: {
          postId,
          postTitle: post.title,
          sellerId,
          buyerId: dto.buyerId,
          price: dto.price ?? post.price,
          status: OrderStatus.PENDING,
        },
      });
    });

    await this.notificationsService.createNotification({
      userId: dto.buyerId,
      type: NotificationType.SYSTEM,
      title: 'Annonce marquée comme vendue',
      body: `Le vendeur a marqué "${post.title}" comme vendue. Confirmez la réception une fois la pièce reçue.`,
      data: { kind: 'ORDER_SOLD', orderId: order.id, postId },
    });

    return { message: 'Annonce marquée comme vendue', order };
  }

  async confirmReception(orderId: string, buyerId: string) {
    const order = await this.getOrderOrThrow(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException(
        "Seul l'acheteur peut confirmer la réception",
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Cette commande a déjà été traitée');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED, confirmedAt: new Date() },
    });

    await this.notificationsService.createNotification({
      userId: order.sellerId,
      type: NotificationType.SYSTEM,
      title: 'Réception confirmée',
      body: `L'acheteur a confirmé la réception de "${order.postTitle}". Vous pouvez maintenant laisser un avis.`,
      data: {
        kind: 'ORDER_CONFIRMED',
        orderId: order.id,
        postId: order.postId,
      },
    });

    return { message: 'Réception confirmée', order: updated };
  }

  async cancel(orderId: string, sellerId: string) {
    const order = await this.getOrderOrThrow(orderId);

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Seul le vendeur peut annuler cette commande',
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Cette commande a déjà été traitée');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
      });

      if (order.postId) {
        await tx.post.updateMany({
          where: { id: order.postId, status: 'SOLD' },
          data: { status: 'ACTIVE' },
        });
      }

      return cancelledOrder;
    });

    await this.notificationsService.createNotification({
      userId: order.buyerId,
      type: NotificationType.SYSTEM,
      title: 'Commande annulée',
      body: `Le vendeur a annulé la vente de "${order.postTitle}".`,
      data: {
        kind: 'ORDER_CANCELLED',
        orderId: order.id,
        postId: order.postId,
      },
    });

    return { message: 'Commande annulée', order: updated };
  }

  async findMyOrders(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where = { OR: [{ buyerId: userId }, { sellerId: userId }] };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => ({
        ...order,
        role: order.buyerId === userId ? 'BUYER' : 'SELLER',
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(orderId: string, userId: string) {
    const order = await this.getOrderOrThrow(orderId);

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Accès interdit à cette commande');
    }

    return { ...order, role: order.buyerId === userId ? 'BUYER' : 'SELLER' };
  }

  private async getOrderOrThrow(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return order;
  }
}
