import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Report, ReportStatus, ReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { FilterReportsDto } from './dto/filter-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    await this.assertTargetReportable(reporterId, dto);

    try {
      const report = await this.prisma.report.create({
        data: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
          details: dto.details?.trim() || null,
        },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      });

      return { message: 'Signalement envoyé', report };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Vous avez déjà signalé ce contenu');
      }
      throw error;
    }
  }

  async findAll(filters: FilterReportsDto) {
    const { page = 1, limit = 10, status, targetType } = filters;

    const where: Prisma.ReportWhereInput = {
      ...(status && { status }),
      ...(targetType && { targetType }),
    };

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    const targets = await this.loadTargetPreviews(reports);

    return {
      data: reports.map((report) => ({
        ...report,
        target: targets.get(`${report.targetType}:${report.targetId}`) ?? null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: string, adminId: string, dto: UpdateReportDto) {
    const existing = await this.prisma.report.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Signalement non trouvé');
    }

    const pending = dto.status === ReportStatus.PENDING;

    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || null,
        reviewedByAdminId: pending ? null : adminId,
        reviewedAt: pending ? null : new Date(),
      },
    });

    return { message: 'Signalement mis à jour', report };
  }

  private async assertTargetReportable(
    reporterId: string,
    dto: CreateReportDto,
  ) {
    switch (dto.targetType) {
      case ReportTargetType.USER: {
        if (dto.targetId === reporterId) {
          throw new BadRequestException('Vous ne pouvez pas vous signaler');
        }
        const user = await this.prisma.user.findUnique({
          where: { id: dto.targetId },
          select: { id: true, deletedAt: true },
        });
        if (!user || user.deletedAt) {
          throw new NotFoundException('Utilisateur non trouvé');
        }
        return;
      }

      case ReportTargetType.POST: {
        const post = await this.prisma.post.findUnique({
          where: { id: dto.targetId },
          select: { userId: true },
        });
        if (!post) {
          throw new NotFoundException('Annonce non trouvée');
        }
        if (post.userId === reporterId) {
          throw new BadRequestException(
            'Vous ne pouvez pas signaler votre propre annonce',
          );
        }
        return;
      }

      case ReportTargetType.MESSAGE: {
        const message = await this.prisma.chatMessage.findUnique({
          where: { id: dto.targetId },
          select: { senderId: true, conversationId: true },
        });
        if (!message) {
          throw new NotFoundException('Message non trouvé');
        }
        if (message.senderId === reporterId) {
          throw new BadRequestException(
            'Vous ne pouvez pas signaler votre propre message',
          );
        }
        // Seuls les participants voient le message : on ne laisse pas signaler
        // (ni sonder l'existence de) un message d'une autre conversation.
        const participant =
          await this.prisma.conversationParticipant.findUnique({
            where: {
              conversationId_userId: {
                conversationId: message.conversationId,
                userId: reporterId,
              },
            },
            select: { id: true },
          });
        if (!participant) {
          throw new ForbiddenException('Accès interdit à cette conversation');
        }
        return;
      }
    }
  }

  /** Aperçu de la cible pour l'admin (null si le contenu a été supprimé depuis). */
  private async loadTargetPreviews(reports: Report[]) {
    const idsOf = (type: ReportTargetType) =>
      reports.filter((r) => r.targetType === type).map((r) => r.targetId);

    const [users, posts, messages] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: idsOf(ReportTargetType.USER) } },
        select: { id: true, name: true, email: true, phone: true },
      }),
      this.prisma.post.findMany({
        where: { id: { in: idsOf(ReportTargetType.POST) } },
        select: { id: true, title: true, userId: true, isApproved: true },
      }),
      this.prisma.chatMessage.findMany({
        where: { id: { in: idsOf(ReportTargetType.MESSAGE) } },
        select: {
          id: true,
          content: true,
          senderId: true,
          conversationId: true,
          createdAt: true,
        },
      }),
    ]);

    const previews = new Map<string, object>();
    users.forEach((u) => previews.set(`USER:${u.id}`, u));
    posts.forEach((p) => previews.set(`POST:${p.id}`, p));
    messages.forEach((m) => previews.set(`MESSAGE:${m.id}`, m));
    return previews;
  }
}
