import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(orderId: string, authorId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'La commande doit être terminée (réception confirmée) avant de laisser un avis',
      );
    }

    if (authorId !== order.buyerId && authorId !== order.sellerId) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette commande',
      );
    }

    const targetId =
      authorId === order.buyerId ? order.sellerId : order.buyerId;

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            orderId,
            authorId,
            targetId,
            rating: dto.rating,
            comment: dto.comment,
          },
        });

        await tx.user.update({
          where: { id: targetId },
          data: {
            ratingSum: { increment: dto.rating },
            reviewsCount: { increment: 1 },
          },
        });

        return created;
      });

      await this.notificationsService.createNotification({
        userId: targetId,
        type: NotificationType.SYSTEM,
        title: 'Nouvel avis reçu',
        body: `Vous avez reçu un avis ${dto.rating}/5 pour "${order.postTitle}".`,
        data: { kind: 'REVIEW_RECEIVED', orderId, reviewId: review.id },
      });

      return { message: 'Avis publié', review };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Vous avez déjà laissé un avis pour cette commande',
        );
      }

      throw error;
    }
  }

  async findForUser(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ratingSum: true, reviewsCount: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { targetId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.review.count({ where: { targetId: userId } }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        avgRating: user.reviewsCount
          ? user.ratingSum / user.reviewsCount
          : null,
        reviewsCount: user.reviewsCount,
      },
    };
  }
}
