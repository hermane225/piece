import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Notification } from '@prisma/client';

export type NotificationPushPayload = {
  userId: string;
  notification: Notification;
};

type Listener = (payload: NotificationPushPayload) => void;

type BusMessage = {
  source: string;
  payload: NotificationPushPayload;
};

@Injectable()
export class NotificationsBusService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsBusService.name);
  private readonly channel = 'notifications:new';
  private readonly sourceId = randomUUID();
  private readonly listeners = new Set<Listener>();

  private readonly publisher: Redis | null;
  private readonly subscriber: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      this.publisher = null;
      this.subscriber = null;
      this.logger.log(
        'Redis absent: diffusion notifications en mode instance unique',
      );
      return;
    }

    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('message', (channel, rawMessage) => {
      if (channel !== this.channel) {
        return;
      }

      try {
        const message = JSON.parse(rawMessage) as BusMessage;
        if (message.source === this.sourceId) {
          return;
        }

        this.emitLocal(message.payload);
      } catch {
        this.logger.warn('Message Redis notifications invalide ignoré');
      }
    });

    void this.subscriber.subscribe(this.channel).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Abonnement Redis notifications impossible: ${message}`,
      );
    });
  }

  async publish(payload: NotificationPushPayload): Promise<void> {
    this.emitLocal(payload);

    if (!this.publisher) {
      return;
    }

    const message: BusMessage = {
      source: this.sourceId,
      payload,
    };

    await this.publisher.publish(this.channel, JSON.stringify(message));
  }

  onUpdate(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }

    if (this.publisher) {
      await this.publisher.quit();
    }
  }

  private emitLocal(payload: NotificationPushPayload) {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}
