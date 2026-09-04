import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export type GeniusPayCustomer = {
  name?: string;
  email?: string;
  phone?: string;
};

export type GeniusPayCreatePaymentInput = {
  amount: number;
  description: string;
  customer: GeniusPayCustomer;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  errorUrl?: string;
};

export type GeniusPayWebhookPayload = {
  id?: string;
  event?: string;
  timestamp?: number;
  created_at?: string;
  data?: {
    reference?: string;
    amount?: number;
    status?: string;
    metadata?: Record<string, unknown>;
    failure_reason?: string;
    reason?: string;
    checkout_url?: string;
    payment_url?: string;
  };
  environment?: string;
  api_version?: string;
};

@Injectable()
export class GeniusPayService {
  private readonly logger = new Logger(GeniusPayService.name);

  private readonly baseUrl =
    process.env.GENIUSPAY_BASE_URL ?? 'https://geniuspay.ci/api/v1/merchant';

  private readonly mode = this.resolveMode();

  constructor() {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        `Clés GeniusPay manquantes pour le mode "${this.mode}" (GENIUSPAY_API_KEY_${this.mode.toUpperCase()} / GENIUSPAY_API_SECRET_${this.mode.toUpperCase()}). Les paiements échoueront tant qu'elles ne sont pas configurées.`,
      );
    }
  }

  private resolveMode() {
    return process.env.GENIUSPAY_MODE?.toLowerCase() === 'sandbox'
      ? 'sandbox'
      : 'live';
  }

  private resolveEnv(...keys: string[]) {
    for (const key of keys) {
      const value = process.env[key];

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private get apiKey() {
    return this.resolveEnv(
      `GENIUSPAY_API_KEY_${this.mode.toUpperCase()}`,
      'GENIUSPAY_API_KEY',
    );
  }

  private get apiSecret() {
    return this.resolveEnv(
      `GENIUSPAY_API_SECRET_${this.mode.toUpperCase()}`,
      'GENIUSPAY_API_SECRET',
    );
  }

  private get webhookSecret() {
    return this.resolveEnv(
      `GENIUSPAY_WEBHOOK_SECRET_${this.mode.toUpperCase()}`,
      'GENIUSPAY_WEBHOOK_SECRET',
    );
  }

  async createCheckoutPayment(input: GeniusPayCreatePaymentInput) {
    if (!this.apiKey || !this.apiSecret) {
      throw new InternalServerErrorException(
        'Configuration GeniusPay manquante (GENIUSPAY_API_KEY[_SANDBOX|_LIVE] / GENIUSPAY_API_SECRET[_SANDBOX|_LIVE])',
      );
    }

    const payload: Record<string, unknown> = {
      amount: input.amount,
      description: input.description,
      customer: input.customer,
      metadata: input.metadata ?? {},
    };

    if (input.successUrl) {
      payload.success_url = input.successUrl;
    }

    if (input.errorUrl) {
      payload.error_url = input.errorUrl;
    }

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'X-API-Secret': this.apiSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'piece-rare-backend/1.0',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Échec de connexion à GeniusPay (${this.baseUrl}/payments): ${message}`,
      );
      throw new InternalServerErrorException(
        'Impossible de joindre GeniusPay. Réessayez dans quelques instants.',
      );
    }

    const rawBody = await response.text();
    let result: any;

    try {
      result = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      this.logger.error(
        `Réponse GeniusPay non-JSON (statut ${response.status}): ${rawBody.slice(0, 500)}`,
      );
      throw new InternalServerErrorException(
        'Réponse invalide de GeniusPay',
      );
    }

    if (!response.ok || !result?.success || !result?.data) {
      this.logger.error(
        `Paiement GeniusPay refusé (statut ${response.status}): ${rawBody.slice(0, 500)}`,
      );
      const message =
        result?.error?.message ?? 'Impossible de créer le paiement GeniusPay';
      throw new BadRequestException(message);
    }

    const checkoutUrl = result.data.checkout_url ?? result.data.payment_url;

    if (!checkoutUrl) {
      throw new InternalServerErrorException(
        'GeniusPay a répondu sans URL de paiement',
      );
    }

    return {
      reference: result.data.reference as string,
      checkoutUrl: checkoutUrl as string,
      raw: result.data,
    };
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    timestamp: string,
    signature: string,
  ) {
    if (!this.webhookSecret) {
      throw new InternalServerErrorException(
        'Configuration GeniusPay manquante (GENIUSPAY_WEBHOOK_SECRET[_SANDBOX|_LIVE])',
      );
    }

    if (!timestamp || !signature) {
      throw new BadRequestException('Headers webhook GeniusPay manquants');
    }

    const payload = Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : rawBody;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    if (expected.length !== signature.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  isWebhookTimestampFresh(timestamp: string, maxAgeSeconds = 300) {
    const parsedTimestamp = Number(timestamp);

    if (!Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) {
      return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.abs(nowSeconds - parsedTimestamp) <= maxAgeSeconds;
  }
}
