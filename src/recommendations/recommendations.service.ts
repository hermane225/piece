import { Injectable } from '@nestjs/common';
import { Category, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { TrackSearchDto } from './dto/track-search.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async upsertPreferences(userId: string, dto: UpsertPreferencesDto) {
    const uniquePreferences = dto.preferences.reduce(
      (acc, item) => {
        acc[item.category] = item.weight ?? 1;
        return acc;
      },
      {} as Record<Category, number>,
    );

    const entries = Object.entries(uniquePreferences) as Array<[Category, number]>;

    await this.prisma.$transaction([
      this.prisma.userCategoryPreference.deleteMany({ where: { userId } }),
      this.prisma.userCategoryPreference.createMany({
        data: entries.map(([category, weight]) => ({
          userId,
          category,
          weight,
        })),
      }),
    ]);

    return {
      message: 'Préférences mises à jour',
      preferences: entries.map(([category, weight]) => ({ category, weight })),
    };
  }

  async trackSearch(userId: string, dto: TrackSearchDto) {
    await this.prisma.userSearchActivity.create({
      data: {
        userId,
        query: dto.query.trim(),
        category: dto.category,
      },
    });

    const suggestions = await this.getSuggestionsForUser(userId, { limit: 5 });

    if (suggestions.data.length) {
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.RECOMMENDATION,
        title: 'Suggestions pour vous',
        body: `${suggestions.data.length} annonces pourraient vous intéresser`,
        data: {
          suggestedPostIds: suggestions.data.slice(0, 3).map((post) => post.id),
        },
      });
    }

    return {
      message: 'Recherche enregistrée',
      suggestedCount: suggestions.data.length,
    };
  }

  async getSuggestionsForUser(userId: string, query: RecommendationQueryDto) {
    const limit = query.limit ?? 10;
    const [preferences, recentSearches] = await Promise.all([
      this.prisma.userCategoryPreference.findMany({ where: { userId } }),
      this.prisma.userSearchActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const categoryScores = new Map<Category, number>();

    for (const pref of preferences) {
      categoryScores.set(pref.category, (categoryScores.get(pref.category) ?? 0) + pref.weight);
    }

    for (const search of recentSearches) {
      if (search.category) {
        categoryScores.set(
          search.category,
          (categoryScores.get(search.category) ?? 0) + 2,
        );
      }
    }

    const sortedCategories = [...categoryScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)
      .slice(0, 5);

    const searchTokens = recentSearches
      .flatMap((activity) => this.extractTokens(activity.query))
      .slice(0, 8);

    const where: Prisma.PostWhereInput = {
      userId: { not: userId },
      isApproved: true,
      OR: [],
    };

    if (sortedCategories.length) {
      where.OR?.push({ category: { in: sortedCategories } });
    }

    if (searchTokens.length) {
      for (const token of searchTokens) {
        where.OR?.push(
          { title: { contains: token, mode: 'insensitive' } },
          { description: { contains: token, mode: 'insensitive' } },
          { brand: { contains: token, mode: 'insensitive' } },
          { model: { contains: token, mode: 'insensitive' } },
        );
      }
    }

    const noSignal = !where.OR?.length;

    const posts = await this.prisma.post.findMany({
      where: noSignal
        ? {
            userId: { not: userId },
            isApproved: true,
          }
        : where,
      take: limit,
      orderBy: [{ boostedUntil: 'desc' }, { createdAt: 'desc' }],
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
      data: posts,
      signals: {
        categories: sortedCategories,
        tokens: searchTokens,
      },
    };
  }

  async getMyPreferences(userId: string) {
    const preferences = await this.prisma.userCategoryPreference.findMany({
      where: { userId },
      orderBy: [{ weight: 'desc' }, { category: 'asc' }],
    });

    return { data: preferences };
  }

  private extractTokens(rawQuery: string) {
    return rawQuery
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .slice(0, 4);
  }
}
