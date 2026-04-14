import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { PresenceUpdatePayload } from './presence.types';

type Listener = (payload: PresenceUpdatePayload) => void;

type BusMessage = {
  source: string;
  payload: PresenceUpdatePayload;
};

@Injectable()
export class PresenceBusService implements OnModuleDestroy {
  private readonly logger = new Logger(PresenceBusService.name);
  private readonly channel = 'presence:update';
  private readonly sourceId = randomUUID();
  private readonly listeners = new Set<Listener>();

  private readonly publisher: Redis | null;
  private readonly subscriber: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      this.publisher = null;
      this.subscriber = null;
      this.logger.log('Redis absent: diffusion présence en mode instance unique');
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
        this.logger.warn('Message Redis présence invalide ignoré');
      }
    });

    void this.subscriber.subscribe(this.channel).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Abonnement Redis présence impossible: ${message}`);
    });
  }

  async publish(payload: PresenceUpdatePayload): Promise<void> {
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

  private emitLocal(payload: PresenceUpdatePayload) {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}