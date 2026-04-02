import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPendingPosts(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where = { isApproved: false };

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
              email: true,
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

  async approvePost(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: post.userId },
        data: { autoApprovePosts: true },
      }),
      this.prisma.post.updateMany({
        where: { userId: post.userId, isApproved: false },
        data: { isApproved: true },
      }),
    ]);

    const updated = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            autoApprovePosts: true,
          },
        },
      },
    });

    return {
      message: 'Annonce approuvée avec succès. Tous les posts de cet utilisateur sont désormais approuvés automatiquement.',
      post: updated,
    };
  }

  async deletePost(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    await this.prisma.post.delete({ where: { id } });

    return { message: 'Annonce supprimée par l\'admin' };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Supprime l'utilisateur et toutes ses annonces (cascade)
    await this.prisma.user.delete({ where: { id } });

    return { message: 'Utilisateur banni et supprimé avec succès' };
  }

  async getAllUsers(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          role: true,
          createdAt: true,
          _count: {
            select: { posts: true },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [totalUsers, totalPosts, pendingPosts, approvedPosts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.post.count(),
        this.prisma.post.count({ where: { isApproved: false } }),
        this.prisma.post.count({ where: { isApproved: true } }),
      ]);

    return {
      totalUsers,
      totalPosts,
      pendingPosts,
      approvedPosts,
    };
  }
}
