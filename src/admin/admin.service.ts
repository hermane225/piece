import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateTechnicianDto } from './dto/create-technician.dto';

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
      message:
        'Annonce approuvée avec succès. Tous les posts de cet utilisateur sont désormais approuvés automatiquement.',
      post: updated,
    };
  }

  async deletePost(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.status === 'SOLD') {
      throw new ForbiddenException(
        'Impossible de supprimer une annonce vendue',
      );
    }

    await this.prisma.post.delete({ where: { id } });

    return { message: "Annonce supprimée par l'admin" };
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

  // Technician Management Methods
  async createTechnician(dto: CreateTechnicianDto, adminId: string) {
    // Check if phone already exists
    const existingTechnician = await this.prisma.technician.findUnique({
      where: { phone: dto.phone },
    });

    if (existingTechnician) {
      throw new ConflictException(
        'Un technicien avec ce numéro de téléphone existe déjà',
      );
    }

    const technician = await this.prisma.technician.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        specialty: dto.specialty,
        city: dto.city,
        email: dto.email,
        description: dto.description,
        address: dto.address,
        certifications: dto.certifications,
        yearsOfExperience: dto.yearsOfExperience,
        hourlyRate: dto.hourlyRate,
        availability: dto.availability,
        status: dto.status ?? true,
        createdByAdminId: adminId,
      },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Technicien créé avec succès',
      technician,
    };
  }

  async getTechnicians(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [technicians, total] = await Promise.all([
      this.prisma.technician.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdByAdmin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.technician.count(),
    ]);

    return {
      data: technicians,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTechnicianById(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!technician) {
      throw new NotFoundException('Technicien non trouvé');
    }

    return technician;
  }

  async updateTechnician(id: string, dto: Partial<CreateTechnicianDto>) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
    });

    if (!technician) {
      throw new NotFoundException('Technicien non trouvé');
    }

    // Check if the phone number is already taken by another technician
    if (dto.phone && dto.phone !== technician.phone) {
      const existingTechnician = await this.prisma.technician.findUnique({
        where: { phone: dto.phone },
      });

      if (existingTechnician) {
        throw new ConflictException(
          'Un technicien avec ce numéro de téléphone existe déjà',
        );
      }
    }

    const updated = await this.prisma.technician.update({
      where: { id },
      data: {
        name: dto.name ?? technician.name,
        phone: dto.phone ?? technician.phone,
        specialty: dto.specialty ?? technician.specialty,
        city: dto.city ?? technician.city,
        email: dto.email ?? technician.email,
        description: dto.description ?? technician.description,
        address: dto.address ?? technician.address,
        certifications: dto.certifications ?? technician.certifications,
        yearsOfExperience:
          dto.yearsOfExperience ?? technician.yearsOfExperience,
        hourlyRate: dto.hourlyRate ?? technician.hourlyRate,
        availability: dto.availability ?? technician.availability,
        status: dto.status ?? technician.status,
      },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Technicien mis à jour avec succès',
      technician: updated,
    };
  }

  async deleteTechnician(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
    });

    if (!technician) {
      throw new NotFoundException('Technicien non trouvé');
    }

    await this.prisma.technician.delete({
      where: { id },
    });

    return { message: 'Technicien supprimé avec succès' };
  }

  async toggleTechnicianStatus(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
    });

    if (!technician) {
      throw new NotFoundException('Technicien non trouvé');
    }

    const updated = await this.prisma.technician.update({
      where: { id },
      data: { status: !technician.status },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: `Technicien ${updated.status ? 'activé' : 'désactivé'} avec succès`,
      technician: updated,
    };
  }
}
