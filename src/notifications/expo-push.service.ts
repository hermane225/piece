import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
} from './dto/push-token.dto';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_MAX_BATCH = 100;

type ExpoTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async registerToken(userId: string, dto: RegisterPushTokenDto) {
    // Le token identifie l'appareil : si un autre compte s'y est connecté
    // avant, il est réattribué à l'utilisateur courant.
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform },
    });

    return { message: 'Token de notification enregistré' };
  }

  async unregisterToken(userId: string, dto: UnregisterPushTokenDto) {
    await this.prisma.pushToken.deleteMany({
      where: { userId, token: dto.token },
    });

    return { message: 'Token de notification supprimé' };
  }

  /** Best effort : ne lève jamais, un échec push ne doit pas casser l'action métier. */
  async sendToUsers(
    userIds: string[],
    payload: { title: string; body: string; data?: Prisma.InputJsonValue },
  ): Promise<void> {
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId: { in: userIds } },
        select: { token: true },
      });
      if (!tokens.length) return;

      const messages = tokens.map(({ token }) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
      }));

      for (let i = 0; i < messages.length; i += EXPO_MAX_BATCH) {
        await this.sendBatch(messages.slice(i, i + EXPO_MAX_BATCH));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Envoi push Expo échoué: ${reason}`);
    }
  }

  private async sendBatch(messages: Array<{ to: string }>) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Expo Push a répondu ${response.status}`);
    }

    const { data: tickets } = (await response.json()) as {
      data?: ExpoTicket[];
    };

    // Les tickets sont dans le même ordre que les messages envoyés.
    const deadTokens = (tickets ?? [])
      .map((ticket, index) => ({ ticket, to: messages[index]?.to }))
      .filter(
        ({ ticket, to }) =>
          to && ticket.details?.error === 'DeviceNotRegistered',
      )
      .map(({ to }) => to);

    if (deadTokens.length) {
      await this.prisma.pushToken.deleteMany({
        where: { token: { in: deadTokens } },
      });
    }
  }
}
