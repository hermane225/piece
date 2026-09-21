import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

export type BlockState = { blockedByMe: boolean; blockedMe: boolean };

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous bloquer vous-même',
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true, deletedAt: true },
    });
    if (!target || target.deletedAt) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Idempotent : bloquer deux fois ne doit pas échouer côté app.
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });

    return { message: 'Utilisateur bloqué', blocked: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });

    return { message: 'Utilisateur débloqué', blocked: false };
  }

  async listBlocked(blockerId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const where = { blockerId };

    const [blocks, total] = await Promise.all([
      this.prisma.block.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          blocked: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.block.count({ where }),
    ]);

    return {
      data: blocks.map((block) => ({
        id: block.blocked.id,
        name: block.blocked.name,
        city: block.blocked.city,
        blockedAt: block.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Pour chaque `otherUserIds`, indique qui a bloqué qui avec `userId`. */
  async getBlockStates(
    userId: string,
    otherUserIds: string[],
  ): Promise<Map<string, BlockState>> {
    const states = new Map<string, BlockState>(
      otherUserIds.map((id) => [id, { blockedByMe: false, blockedMe: false }]),
    );
    if (!otherUserIds.length) return states;

    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: otherUserIds } },
          { blockedId: userId, blockerId: { in: otherUserIds } },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });

    for (const block of blocks) {
      if (block.blockerId === userId) {
        const state = states.get(block.blockedId);
        if (state) state.blockedByMe = true;
      } else {
        const state = states.get(block.blockerId);
        if (state) state.blockedMe = true;
      }
    }

    return states;
  }

  /** 403 si un blocage existe (dans un sens ou l'autre) avec l'un des interlocuteurs. */
  async assertNoBlock(userId: string, otherUserIds: string[]) {
    const states = await this.getBlockStates(userId, otherUserIds);

    for (const state of states.values()) {
      if (state.blockedByMe) {
        throw new ForbiddenException(
          'Vous avez bloqué cet utilisateur. Débloquez-le pour lui écrire.',
        );
      }
      if (state.blockedMe) {
        throw new ForbiddenException(
          'Vous ne pouvez pas envoyer de message à cet utilisateur.',
        );
      }
    }
  }
}
