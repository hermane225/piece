import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';
import { PresenceBusService } from './presence-bus.service';
import { PresenceUpdatePayload } from './presence.types';

type JwtPayload = {
  sub: string;
  email: string;
};

type SubscribePayload = {
  userIds?: string[];
};

@Injectable()
@WebSocketGateway({
  namespace: '/presence',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class PresenceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(PresenceGateway.name);
  private unsubscribePresenceBus: (() => void) | null = null;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly presenceBusService: PresenceBusService,
  ) {}

  afterInit() {
    this.unsubscribePresenceBus = this.presenceBusService.onUpdate((update) => {
      this.broadcastPresenceUpdate(update);
    });
  }

  onModuleDestroy() {
    this.unsubscribePresenceBus?.();
    this.unsubscribePresenceBus = null;
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.authenticateSocket(client);
      client.data.userId = userId;

      await this.presenceService.registerConnection(userId, client.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connexion socket non autorisée';
      this.logger.warn(`Connexion présence rejetée (${client.id}): ${message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    await this.presenceService.handleDisconnect(client.id);
  }

  @SubscribeMessage('presence:subscribe')
  async onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ) {
    const userId = this.getCurrentUserId(client);
    const userIds = payload?.userIds;

    if (!Array.isArray(userIds)) {
      throw new WsException('Payload invalide: userIds[] est obligatoire');
    }

    const snapshot = await this.presenceService.subscribe(userId, client.id, userIds);
    client.emit('presence:snapshot', snapshot);
    return snapshot;
  }

  @SubscribeMessage('presence:heartbeat')
  async onHeartbeat(@ConnectedSocket() client: Socket) {
    await this.presenceService.handleHeartbeat(client.id);

    return {
      ok: true,
      serverTime: new Date().toISOString(),
    };
  }

  private async authenticateSocket(client: Socket): Promise<string> {
    const authHeader = client.handshake.headers.authorization;
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;

    const token = this.extractToken(authHeader, authToken);
    if (!token) {
      throw new WsException('JWT manquant pour la connexion présence');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    if (!payload?.sub) {
      throw new WsException('JWT invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!user) {
      throw new WsException('Utilisateur non trouvé');
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

  private getCurrentUserId(client: Socket): string {
    const userId = client.data.userId;
    if (!userId || typeof userId !== 'string') {
      throw new WsException('Utilisateur socket introuvable');
    }

    return userId;
  }

  private broadcastPresenceUpdate(update: PresenceUpdatePayload) {
    const targetSocketIds = this.presenceService.getSocketIdsSubscribedToUser(
      update.userId,
    );

    for (const socketId of targetSocketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) {
        continue;
      }

      socket.emit('presence:update', update);
    }
  }
}