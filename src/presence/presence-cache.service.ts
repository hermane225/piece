import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PresenceUserState } from './presence.types';

type LocalCacheValue = {
  value: PresenceUserState;
  expiresAtMs: number;
};

@Injectable()
export class PresenceCacheService implements OnModuleDestroy {
  private readonly keyPrefix = 'presence:state:';
  private readonly ttlSeconds: number;
  private readonly redisClient: Redis | null;
  private readonly localCache = new Map<string, LocalCacheValue>();

  constructor(private readonly configService: ConfigService) {
    this.ttlSeconds = this.getBoundedNumber(
      this.configService.get<string>('PRESENCE_CACHE_TTL_SECONDS'),
      180,
      60,
      600,
    );

    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    this.redisClient = redisUrl ? new Redis(redisUrl) : null;
  }

  async set(userState: PresenceUserState): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.set(
        `${this.keyPrefix}${userState.userId}`,
        JSON.stringify(userState),
        'EX',
        this.ttlSeconds,
      );
      return;
    }

    this.localCache.set(userState.userId, {
      value: userState,
      expiresAtMs: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async getBatch(userIds: string[]): Promise<Map<string, PresenceUserState>> {
    if (!userIds.length) {
      return new Map<string, PresenceUserState>();
    }

    if (this.redisClient) {
      const keys = userIds.map((userId) => `${this.keyPrefix}${userId}`);
      const rows = await this.redisClient.mget(...keys);
      const map = new Map<string, PresenceUserState>();

      userIds.forEach((userId, index) => {
        const rawValue = rows[index];
        if (!rawValue) {
          return;
        }

        try {
          const parsed = JSON.parse(rawValue) as PresenceUserState;
          map.set(userId, parsed);
        } catch {
          return;
        }
      });

      return map;
    }

    const nowMs = Date.now();
    const map = new Map<string, PresenceUserState>();

    for (const userId of userIds) {
      const cached = this.localCache.get(userId);
      if (!cached) {
        continue;
      }

      if (cached.expiresAtMs <= nowMs) {
        this.localCache.delete(userId);
        continue;
      }

      map.set(userId, cached.value);
    }

    return map;
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
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