import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const { password, resetPasswordToken, resetPasswordExpiresAt, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Vérifier l'unicité de l'email si modifié
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    // Vérifier l'unicité du téléphone si modifié
    if (dto.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    // Hasher le nouveau mot de passe si fourni
    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    const { password, resetPasswordToken, resetPasswordExpiresAt, ...result } = user;
    return {
      message: 'Profil mis à jour avec succès',
      user: result,
    };
  }
}
