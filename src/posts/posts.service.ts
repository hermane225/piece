import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, CategoryEnum, ConditionEnum } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

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

    const now = new Date();
    let boostedUntil: Date;

    if (post.boostedUntil && new Date(post.boostedUntil).getTime() > now.getTime()) {
      boostedUntil = new Date(new Date(post.boostedUntil).getTime() + days * 24 * 60 * 60 * 1000);
    } else {
      boostedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    await this.prisma.post.update({
      where: { id },
      data: { boostedUntil },
    });

    return {
      message: `Annonce boostée jusqu'au ${boostedUntil.toLocaleDateString()}`,
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        ...dto,
        images: Array.isArray(dto.images) ? dto.images : [],
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
      brand,
      city,
      category,
      condition,
      minPrice,
      maxPrice,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    // Construire le filtre dynamiquement
    const where: any = {};

    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (category) where.category = category;
    if (condition) where.condition = condition;

    if (minPrice || maxPrice) {
      (where as Record<string, any>).price = {};
      if (minPrice) (where as Record<string, any>).price.gte = minPrice;
      if (maxPrice) (where as Record<string, any>).price.lte = maxPrice;
    }

    if (search) {
      (where as Record<string, any>).OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.post.count({ where }),
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
