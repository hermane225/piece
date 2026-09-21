import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatBusService, ChatEvent } from './chat-bus.service';

type JwtPayload = {
  sub: string;
  email: string;
};

/**
 * Canal temps réel de la messagerie (namespace `/chat`).
 * Serveur -> client uniquement : l'envoi et la lecture passent toujours par
 * l'API REST, le socket ne fait que pousser :
 *  - `message:new  { conversationId, message }`
 *  - `message:read { conversationId, readerId, readAt, messageIds }`
 */
@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private unsubscribeChatBus: (() => void) | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly chatBusService: ChatBusService,
  ) {}

  afterInit() {
    this.unsubscribeChatBus = this.chatBusService.onUpdate((event) =>
      this.pushEvent(event),
    );
  }

  onModuleDestroy() {
    this.unsubscribeChatBus?.();
    this.unsubscribeChatBus = null;
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.authenticateSocket(client);
      client.data.userId = userId;
      await client.join(this.roomFor(userId));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Connexion socket non autorisée';
      this.logger.warn(`Connexion chat rejetée (${client.id}): ${message}`);
      client.disconnect(true);
    }
  }

  private pushEvent({ userIds, event, payload }: ChatEvent) {
    for (const userId of userIds) {
      this.server.to(this.roomFor(userId)).emit(event, payload);
    }
  }

  private roomFor(userId: string) {
    return `user:${userId}`;
  }

  private async authenticateSocket(client: Socket): Promise<string> {
    const authHeader = client.handshake.headers.authorization;
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;

    const token = this.extractToken(authHeader, authToken);
    if (!token) {
      throw new Error('JWT manquant pour la connexion chat');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    if (!payload?.sub) {
      throw new Error('JWT invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
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
}
