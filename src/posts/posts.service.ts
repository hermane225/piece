import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePostDto,
  CategoryEnum,
  ConditionEnum,
} from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private buildBaseWhere(filters: FilterPostsDto): Prisma.PostWhereInput {
    const { brand, city, category, condition, minPrice, maxPrice, search } =
      filters;

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
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const now = new Date();
    const baseWhere = this.buildBaseWhere(filters);

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

    // 3 paliers de tri, du plus prioritaire au moins prioritaire : boosté,
    // puis vendeur vérifié, puis le reste. Un where dédié par palier (plutôt
    // qu'un simple orderBy) évite qu'un boost expiré ne se classe devant les
    // annonces standard.
    const tiers: Array<{
      where: Prisma.PostWhereInput;
      orderBy: Prisma.PostOrderByWithRelationInput[];
    }> = [
      {
        where: { AND: [baseWhere, { boostedUntil: { gt: now } }] },
        orderBy: [{ boostedUntil: 'desc' }, { createdAt: 'desc' }],
      },
      {
        where: {
          AND: [
            baseWhere,
            { OR: [{ boostedUntil: null }, { boostedUntil: { lte: now } }] },
            { user: { isVerifiedSeller: true } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
      },
      {
        where: {
          AND: [
            baseWhere,
            { OR: [{ boostedUntil: null }, { boostedUntil: { lte: now } }] },
            { user: { isVerifiedSeller: false } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
      },
    ];

    const counts = await Promise.all(
      tiers.map((tier) => this.prisma.post.count({ where: tier.where })),
    );
    const total = counts.reduce((sum, count) => sum + count, 0);

    const posts: unknown[] = [];
    let remainingSkip = skip;
    let remainingTake = limit;

    for (let i = 0; i < tiers.length && remainingTake > 0; i++) {
      const tierCount = counts[i];

      if (remainingSkip >= tierCount) {
        remainingSkip -= tierCount;
        continue;
      }

      const tierPosts = await this.prisma.post.findMany({
        where: tiers[i].where,
        orderBy: tiers[i].orderBy,
        skip: remainingSkip,
        take: remainingTake,
        include: includeUser,
      });

      posts.push(...tierPosts);
      remainingTake -= tierPosts.length;
      remainingSkip = 0;
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
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres annonces',
      );
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
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres annonces',
      );
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
