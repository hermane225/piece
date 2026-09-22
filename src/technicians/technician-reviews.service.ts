import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';

const digitsOnly = (value?: string | null) => (value ?? '').replace(/\D/g, '');

@Injectable()
export class TechnicianReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActiveTechnician(technicianId: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { id: true, phone: true, status: true, createdByAdminId: true },
    });

    if (!technician || !technician.status) {
      throw new NotFoundException('Technicien non trouvé');
    }

    return technician;
  }

  async create(technicianId: string, authorId: string, dto: CreateReviewDto) {
    const technician = await this.getActiveTechnician(technicianId);

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, phone: true },
    });

    if (!author) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Une fiche n'est pas liée à un compte : on écarte l'administrateur qui l'a
    // créée et l'utilisateur dont le numéro est celui du technicien.
    const authorPhone = digitsOnly(author.phone);
    const isSelfReview =
      authorId === technician.createdByAdminId ||
      (authorPhone.length > 0 && authorPhone === digitsOnly(technician.phone));

    if (isSelfReview) {
      throw new ForbiddenException(
        'Vous ne pouvez pas laisser un avis sur votre propre fiche',
      );
    }

    try {
      const review = await this.prisma.technicianReview.create({
        data: {
          technicianId,
          authorId,
          rating: dto.rating,
          comment: dto.comment?.trim() || undefined,
        },
      });

      return { message: 'Avis publié', review };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Vous avez déjà laissé un avis pour ce technicien',
        );
      }

      throw error;
    }
  }

  async findForTechnician(technicianId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    await this.getActiveTechnician(technicianId);

    const where = { technicianId };

    const [reviews, total, aggregate] = await Promise.all([
      this.prisma.technicianReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.technicianReview.count({ where }),
      this.prisma.technicianReview.aggregate({
        where,
        _avg: { rating: true },
      }),
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
        avgRating: total ? (aggregate._avg.rating ?? null) : null,
        reviewsCount: total,
      },
    };
  }
}
