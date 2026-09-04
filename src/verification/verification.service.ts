import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submit(
    userId: string,
    dto: SubmitVerificationDto,
    file: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerifiedSeller: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.isVerifiedSeller) {
      throw new BadRequestException('Votre profil est déjà vérifié');
    }

    const pending = await this.prisma.sellerVerification.findFirst({
      where: { userId, status: VerificationStatus.PENDING },
      select: { id: true },
    });

    if (pending) {
      throw new BadRequestException(
        'Une demande de vérification est déjà en attente',
      );
    }

    const { publicId, format } =
      await this.cloudinaryService.uploadPrivateDocument(file);

    const verification = await this.prisma.sellerVerification.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentPublicId: publicId,
        documentFormat: format,
      },
    });

    return {
      message: 'Demande de vérification envoyée',
      status: verification.status,
    };
  }

  async getMyStatus(userId: string) {
    const latest = await this.prisma.sellerVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        documentType: true,
        rejectionReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    if (!latest) {
      return { status: 'NONE' as const };
    }

    return latest;
  }

  async getPendingRequests(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where = { status: VerificationStatus.PENDING };

    const [requests, total] = await Promise.all([
      this.prisma.sellerVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
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
      this.prisma.sellerVerification.count({ where }),
    ]);

    return {
      data: requests.map((request) => ({
        id: request.id,
        documentType: request.documentType,
        createdAt: request.createdAt,
        user: request.user,
        documentUrl: this.cloudinaryService.getSignedDocumentUrl(
          request.documentPublicId,
          request.documentFormat,
        ),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(id: string, adminId: string) {
    const request = await this.getPendingById(id);

    await this.prisma.$transaction([
      this.prisma.sellerVerification.update({
        where: { id },
        data: {
          status: VerificationStatus.APPROVED,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: request.userId },
        data: { isVerifiedSeller: true },
      }),
    ]);

    await this.notificationsService.createNotification({
      userId: request.userId,
      type: NotificationType.SYSTEM,
      title: 'Profil vérifié',
      body: 'Votre profil vendeur est désormais vérifié.',
      data: { verificationId: id },
    });

    return { message: 'Vérification approuvée' };
  }

  async reject(id: string, adminId: string, dto: RejectVerificationDto) {
    const request = await this.getPendingById(id);

    await this.prisma.sellerVerification.update({
      where: { id },
      data: {
        status: VerificationStatus.REJECTED,
        rejectionReason: dto.reason,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.notificationsService.createNotification({
      userId: request.userId,
      type: NotificationType.SYSTEM,
      title: 'Vérification refusée',
      body: dto.reason,
      data: { verificationId: id },
    });

    return { message: 'Vérification refusée' };
  }

  private async getPendingById(id: string) {
    const request = await this.prisma.sellerVerification.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!request) {
      throw new NotFoundException('Demande de vérification non trouvée');
    }

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    return request;
  }
}
