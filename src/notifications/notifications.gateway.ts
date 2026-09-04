import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationsBusService,
  NotificationPushPayload,
} from './notifications-bus.service';

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly socketIdsByUserId = new Map<string, Set<string>>();
  private unsubscribeNotificationsBus: (() => void) | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationsBusService: NotificationsBusService,
  ) {}

  afterInit() {
    this.unsubscribeNotificationsBus = this.notificationsBusService.onUpdate(
      (update) => {
        this.pushToUser(update);
      },
    );
  }

  onModuleDestroy() {
    this.unsubscribeNotificationsBus?.();
    this.unsubscribeNotificationsBus = null;
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.authenticateSocket(client);
      client.data.userId = userId;
      this.addSocketForUser(userId, client.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Connexion socket non autorisée';
      this.logger.warn(
        `Connexion notifications rejetée (${client.id}): ${message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      this.removeSocketForUser(userId, client.id);
    }
  }

  private pushToUser(update: NotificationPushPayload) {
    const socketIds = this.socketIdsByUserId.get(update.userId);
    if (!socketIds?.size) {
      return;
    }

    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) {
        continue;
      }

      socket.emit('notification:new', update.notification);
    }
  }

  private async authenticateSocket(client: Socket): Promise<string> {
    const authHeader = client.handshake.headers.authorization;
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;

    const token = this.extractToken(authHeader, authToken);
    if (!token) {
      throw new Error('JWT manquant pour la connexion notifications');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    if (!payload?.sub) {
      throw new Error('JWT invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user.id;
  }

  private extractToken(
    authorizationHeader: string | string[] | undefined,
    authToken: string | undefined,
  ): string | null {
    if (authToken?.trim()) {
      return authToken.trim();
    }

    if (typeof authorizationHeader === 'string') {
      const value = authorizationHeader.trim();
      if (value.startsWith('Bearer ')) {
        return value.slice('Bearer '.length).trim();
      }
    }

    return null;
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
}
