import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  PresenceSnapshotPayload,
  PresenceUpdatePayload,
  PresenceUserState,
} from './presence.types';
import { PresenceBusService } from './presence-bus.service';
import { PresenceCacheService } from './presence-cache.service';

type SocketState = {
  socketId: string;
  userId: string;
  subscriptions: Set<string>;
  lastHeartbeatAtMs: number;
  timeout: NodeJS.Timeout;
  closed: boolean;
};

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly statesBySocketId = new Map<string, SocketState>();
  private readonly socketIdsByUserId = new Map<string, Set<string>>();
  private readonly heartbeatTimeoutMs: number;
  private readonly heartbeatMinIntervalMs: number;
  private readonly maxSubscribedUserIds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly presenceBusService: PresenceBusService,
    private readonly presenceCacheService: PresenceCacheService,
  ) {
    this.heartbeatTimeoutMs = this.getBoundedNumber(
      this.configService.get<string>('PRESENCE_HEARTBEAT_TIMEOUT_MS'),
      75000,
      60000,
      90000,
    );
    this.heartbeatMinIntervalMs = this.getBoundedNumber(
      this.configService.get<string>('PRESENCE_HEARTBEAT_MIN_INTERVAL_MS'),
      5000,
      1000,
      10000,
    );
    this.maxSubscribedUserIds = this.getBoundedNumber(
      this.configService.get<string>('PRESENCE_MAX_SUBSCRIBED_USERS'),
      200,
      1,
      1000,
    );
  }

  async registerConnection(
    userId: string,
    socketId: string,
  ): Promise<PresenceUpdatePayload> {
    const now = new Date();

    await this.prisma.userPresence.upsert({
      where: { userId },
      create: {
        userId,
        isOnline: true,
        socketCount: 1,
        lastSeenAt: now,
      },
      update: {
        isOnline: true,
        socketCount: { increment: 1 },
        lastSeenAt: now,
      },
    });

    const state: SocketState = {
      socketId,
      userId,
      subscriptions: new Set<string>(),
      lastHeartbeatAtMs: Date.now(),
      timeout: this.buildSocketTimeout(socketId),
      closed: false,
    };

    this.statesBySocketId.set(socketId, state);
    this.addSocketForUser(userId, socketId);

    const update = this.buildPresenceUpdate(userId, true, now);
    await this.presenceCacheService.set({
      userId: update.userId,
      isOnline: update.isOnline,
      lastSeenAt: update.lastSeenAt,
    });
    await this.presenceBusService.publish(update);
    return update;
  }

  async handleHeartbeat(socketId: string): Promise<PresenceUpdatePayload | null> {
    const state = this.statesBySocketId.get(socketId);
    if (!state || state.closed) {
      return null;
    }

    const nowMs = Date.now();
    if (nowMs - state.lastHeartbeatAtMs < this.heartbeatMinIntervalMs) {
      return null;
    }

    state.lastHeartbeatAtMs = nowMs;
    this.resetSocketTimeout(state);

    const now = new Date();
    await this.prisma.userPresence.upsert({
      where: { userId: state.userId },
      create: {
        userId: state.userId,
        isOnline: true,
        socketCount: 1,
        lastSeenAt: now,
      },
      update: {
        isOnline: true,
        lastSeenAt: now,
      },
    });

    const update = this.buildPresenceUpdate(state.userId, true, now);
    await this.presenceCacheService.set({
      userId: update.userId,
      isOnline: update.isOnline,
      lastSeenAt: update.lastSeenAt,
    });
    await this.presenceBusService.publish(update);
    return update;
  }

  async handleDisconnect(socketId: string): Promise<PresenceUpdatePayload | null> {
    const state = this.statesBySocketId.get(socketId);
    if (!state || state.closed) {
      return null;
    }

    state.closed = true;
    clearTimeout(state.timeout);

    this.statesBySocketId.delete(socketId);
    this.removeSocketForUser(state.userId, socketId);

    const now = new Date();

    const finalState = await this.prisma.$transaction(async (tx) => {
      const current = await tx.userPresence.findUnique({
        where: { userId: state.userId },
        select: { socketCount: true },
      });

      if (!current) {
        return tx.userPresence.create({
          data: {
            userId: state.userId,
            socketCount: 0,
            isOnline: false,
            lastSeenAt: now,
          },
          select: { isOnline: true, socketCount: true },
        });
      }

      const nextSocketCount = Math.max(0, current.socketCount - 1);
      return tx.userPresence.update({
        where: { userId: state.userId },
        data: {
          socketCount: nextSocketCount,
          isOnline: nextSocketCount > 0,
          lastSeenAt: now,
        },
        select: { isOnline: true, socketCount: true },
      });
    });

    const update = this.buildPresenceUpdate(state.userId, finalState.isOnline, now);
    await this.presenceCacheService.set({
      userId: update.userId,
      isOnline: update.isOnline,
      lastSeenAt: update.lastSeenAt,
    });
    await this.presenceBusService.publish(update);
    return update;
  }

  async subscribe(
    currentUserId: string,
    socketId: string,
    userIds: string[],
  ): Promise<PresenceSnapshotPayload> {
    const state = this.statesBySocketId.get(socketId);
    if (!state || state.userId !== currentUserId) {
      throw new ForbiddenException('Socket non autorisé pour cet utilisateur');
    }

    const normalizedUserIds = this.normalizeUserIds(userIds);
    if (normalizedUserIds.length > this.maxSubscribedUserIds) {
      throw new BadRequestException(
        `Vous pouvez suivre au maximum ${this.maxSubscribedUserIds} utilisateurs`,
      );
    }

    await this.assertCanReadPresence(currentUserId, normalizedUserIds);

    state.subscriptions = new Set(normalizedUserIds);

    return this.getBatch(currentUserId, normalizedUserIds);
  }

  async getBatch(
    currentUserId: string,
    userIds: string[],
  ): Promise<PresenceSnapshotPayload> {
    const normalizedUserIds = this.normalizeUserIds(userIds);

    if (!normalizedUserIds.length) {
      throw new BadRequestException('userIds ne peut pas être vide');
    }

    if (normalizedUserIds.length > this.maxSubscribedUserIds) {
      throw new BadRequestException(
        `Vous pouvez demander au maximum ${this.maxSubscribedUserIds} utilisateurs`,
      );
    }

    await this.assertCanReadPresence(currentUserId, normalizedUserIds);

    const users = await this.getPresenceUsers(normalizedUserIds);
    return {
      users,
      serverTime: new Date().toISOString(),
    };
  }

  getSocketIdsSubscribedToUser(userId: string): string[] {
    const socketIds: string[] = [];

    for (const [socketId, state] of this.statesBySocketId.entries()) {
      if (!state.closed && state.subscriptions.has(userId)) {
        socketIds.push(socketId);
      }
    }

    return socketIds;
  }

  private buildSocketTimeout(socketId: string): NodeJS.Timeout {
    return setTimeout(() => {
      void this.handleDisconnect(socketId).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Erreur inconnue timeout présence';
        this.logger.error(`Timeout de présence échoué pour ${socketId}: ${message}`);
      });
    }, this.heartbeatTimeoutMs);
  }

  private resetSocketTimeout(state: SocketState) {
    clearTimeout(state.timeout);
    state.timeout = this.buildSocketTimeout(state.socketId);
  }

  private addSocketForUser(userId: string, socketId: string) {
    const socketIds = this.socketIdsByUserId.get(userId) ?? new Set<string>();
    socketIds.add(socketId);
    this.socketIdsByUserId.set(userId, socketIds);
  }

  private removeSocketForUser(userId: string, socketId: string) {
    const socketIds = this.socketIdsByUserId.get(userId);
    if (!socketIds) {
      return;
    }

    socketIds.delete(socketId);
    if (!socketIds.size) {
      this.socketIdsByUserId.delete(userId);
    }
  }

  private async assertCanReadPresence(currentUserId: string, userIds: string[]) {
    const requestedWithoutSelf = userIds.filter((id) => id !== currentUserId);
    if (!requestedWithoutSelf.length) {
      return;
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: { in: requestedWithoutSelf } } } },
        ],
      },
      select: {
        participants: {
          select: { userId: true },
        },
      },
    });

    const authorizedUserIds = new Set<string>([currentUserId]);
    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        authorizedUserIds.add(participant.userId);
      }
    }

    const unauthorized = requestedWithoutSelf.filter(
      (targetUserId) => !authorizedUserIds.has(targetUserId),
    );

    if (unauthorized.length) {
      throw new ForbiddenException(
        'Abonnement présence interdit pour un ou plusieurs userIds',
      );
    }
  }

  private async getPresenceUsers(userIds: string[]): Promise<PresenceUserState[]> {
    const fromCache = await this.presenceCacheService.getBatch(userIds);
    const missingUserIds = userIds.filter((userId) => !fromCache.has(userId));

    const presenceRows = await this.prisma.userPresence.findMany({
      where: { userId: { in: missingUserIds } },
      select: {
        userId: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    const rowsByUserId = new Map<string, PresenceUserState>(
      presenceRows.map((row) => [
        row.userId,
        {
          userId: row.userId,
          isOnline: row.isOnline,
          lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
        },
      ]),
    );

    for (const value of fromCache.values()) {
      rowsByUserId.set(value.userId, value);
    }

    for (const value of rowsByUserId.values()) {
      await this.presenceCacheService.set(value);
    }

    return userIds.map((userId) => {
      const existing = rowsByUserId.get(userId);
      if (existing) {
        return existing;
      }

      return {
        userId,
        isOnline: false,
        lastSeenAt: null,
      };
    });
  }

  private normalizeUserIds(userIds: string[]): string[] {
    if (!Array.isArray(userIds)) {
      return [];
    }

    return [...new Set(userIds.map((id) => id?.trim()).filter(Boolean))];
  }

  private buildPresenceUpdate(
    userId: string,
    isOnline: boolean,
    lastSeenAt: Date,
  ): PresenceUpdatePayload {
    const iso = lastSeenAt.toISOString();

    return {
      userId,
      isOnline,
      lastSeenAt: iso,
      serverTime: iso,
    };
  }

  private getBoundedNumber(
    rawValue: string | undefined,
    defaultValue: number,
    min: number,
    max: number,
  ) {
    const parsed = Number.parseInt(rawValue ?? '', 10);
    if (!Number.isFinite(parsed)) {
      return defaultValue;
    }

    return Math.max(min, Math.min(max, parsed));
  }
}