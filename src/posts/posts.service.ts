import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        ...dto,
        images: dto.images || [],
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
      message: 'Annonce créée avec succès. En attente de validation.',
      post,
    };
  }

  async findAll(filters: FilterPostsDto) {
    const { page = 1, limit = 10, brand, city, category, condition, minPrice, maxPrice, search } = filters;
    const skip = (page - 1) * limit;

    // Construire le filtre dynamiquement
    const where: any = {
      isApproved: true,
    };

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
