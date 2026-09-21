import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

export type ChatEventName = 'message:new' | 'message:read';

export type ChatEvent = {
  userIds: string[];
  event: ChatEventName;
  payload: Record<string, unknown>;
};

type Listener = (event: ChatEvent) => void;

type BusMessage = { source: string; event: ChatEvent };

/** Même principe que NotificationsBusService : Redis si dispo, sinon instance unique. */
@Injectable()
export class ChatBusService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatBusService.name);
  private readonly channel = 'chat:events';
  private readonly sourceId = randomUUID();
  private readonly listeners = new Set<Listener>();

  private readonly publisher: Redis | null;
  private readonly subscriber: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      this.publisher = null;
      this.subscriber = null;
      this.logger.log('Redis absent: diffusion chat en mode instance unique');
      return;
    }

    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('message', (channel, rawMessage) => {
      if (channel !== this.channel) return;

      try {
        const message = JSON.parse(rawMessage) as BusMessage;
        if (message.source === this.sourceId) return;

        this.emitLocal(message.event);
      } catch {
        this.logger.warn('Message Redis chat invalide ignoré');
      }
    });

    void this.subscriber.subscribe(this.channel).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Abonnement Redis chat impossible: ${message}`);
    });
  }

  /** Best effort : le temps réel ne doit jamais faire échouer l'envoi d'un message. */
  async publish(event: ChatEvent): Promise<void> {
    this.emitLocal(event);

    if (!this.publisher) return;

    try {
      const message: BusMessage = { source: this.sourceId, event };
      await this.publisher.publish(this.channel, JSON.stringify(message));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Publication Redis chat échouée: ${reason}`);
    }
  }

  onUpdate(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
    await this.publisher?.quit();
  }

  private emitLocal(event: ChatEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
