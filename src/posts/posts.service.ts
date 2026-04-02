import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, CategoryEnum, ConditionEnum } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';
import { PayBoostDto } from './dto/pay-boost.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private computeBoostedUntil(currentBoostedUntil: Date | null, days: number): Date {
    const now = new Date();
    if (currentBoostedUntil && currentBoostedUntil.getTime() > now.getTime()) {
      return new Date(currentBoostedUntil.getTime() + days * 24 * 60 * 60 * 1000);
    }
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private buildBaseWhere(filters: FilterPostsDto): Prisma.PostWhereInput {
    const {
      brand,
      city,
      category,
      condition,
      minPrice,
      maxPrice,
      search,
    } = filters;

    const where: Prisma.PostWhereInput = {};

    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (category) where.category = category;
    if (condition) where.condition = condition;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async boostPost(id: string, userId: string, days: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { userId: true, boostedUntil: true },
    });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez booster que vos propres annonces');
    }

    const boostedUntil = this.computeBoostedUntil(post.boostedUntil, days);

    await this.prisma.post.update({
      where: { id },
      data: { boostedUntil },
    });

    return {
      message: `Annonce boostée jusqu'au ${boostedUntil.toLocaleDateString()}`,
    };
  }

  async payAndBoost(id: string, userId: string, dto: PayBoostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { userId: true, boostedUntil: true },
    });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez booster que vos propres annonces');
    }

    const days = dto.days ?? 7;
    const boostedUntil = this.computeBoostedUntil(post.boostedUntil, days);

    await this.prisma.post.update({
      where: { id },
      data: {
        boostedUntil,
        boostPaymentAmount: dto.amount,
        boostPaymentReference: dto.paymentReference,
        boostPaidAt: new Date(),
      },
    });

    return {
      message: `Paiement validé. Annonce boostée jusqu'au ${boostedUntil.toLocaleDateString()}`,
      boostedUntil,
      payment: {
        amount: dto.amount,
        reference: dto.paymentReference,
      },
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autoApprovePosts: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const post = await this.prisma.post.create({
      data: {
        ...dto,
        images: Array.isArray(dto.images) ? dto.images : [],
        isApproved: user.autoApprovePosts,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
          },
        },
      },
    });

    return {
      message: 'Annonce créée avec succès.',
      post,
    };
  }

  getFilterOptions() {
    return {
      categories: Object.values(CategoryEnum),
      conditions: Object.values(ConditionEnum),
    };
  }

  async findAll(filters: FilterPostsDto) {
    const {
      page = 1,
      limit = 10,
    } = filters;
    const skip = (page - 1) * limit;
    const now = new Date();
    const baseWhere = this.buildBaseWhere(filters);

    const boostedWhere: Prisma.PostWhereInput = {
      AND: [
        baseWhere,
        { boostedUntil: { gt: now } },
      ],
    };

    const regularWhere: Prisma.PostWhereInput = {
      AND: [
        baseWhere,
        {
          OR: [
            { boostedUntil: null },
            { boostedUntil: { lte: now } },
          ],
        },
      ],
    };

    const includeUser = {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          city: true,
        },
      },
    };

    const [boostedCount, regularCount] = await Promise.all([
      this.prisma.post.count({ where: boostedWhere }),
      this.prisma.post.count({ where: regularWhere }),
    ]);

    const total = boostedCount + regularCount;
    let posts: any[] = [];

    if (skip < boostedCount) {
      const boostedPosts = await this.prisma.post.findMany({
        where: boostedWhere,
        skip,
        take: limit,
        orderBy: [{ boostedUntil: 'desc' }, { createdAt: 'desc' }],
        include: includeUser,
      });

      const remaining = limit - boostedPosts.length;
      if (remaining > 0) {
        const regularPosts = await this.prisma.post.findMany({
          where: regularWhere,
          skip: 0,
          take: remaining,
          orderBy: { createdAt: 'desc' },
          include: includeUser,
        });
        posts = [...boostedPosts, ...regularPosts];
      } else {
        posts = boostedPosts;
      }
    } else {
      const regularSkip = skip - boostedCount;
      posts = await this.prisma.post.findMany({
        where: regularWhere,
        skip: regularSkip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: includeUser,
      });
    }

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres annonces');
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
          },
        },
      },
    });

    return {
      message: 'Annonce mise à jour avec succès',
      post: updated,
    };
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres annonces');
    }

    await this.prisma.post.delete({ where: { id } });

    return { message: 'Annonce supprimée avec succès' };
  }

  async findMyPosts(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where: { userId } }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
