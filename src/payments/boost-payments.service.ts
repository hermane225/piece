import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, BoostPaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PayBoostDto } from '../posts/dto/pay-boost.dto';
import { GeniusPayService, GeniusPayWebhookPayload } from './geniuspay.service';

type BoostPlan = {
  amount: number;
  days: number;
};

const BOOST_PLANS: Record<number, BoostPlan> = {
  1: { amount: 200, days: 1 },
  3: { amount: 500, days: 3 },
  7: { amount: 1000, days: 7 },
  20: { amount: 2000, days: 20 },
};

const PAYMENT_STATUS_BY_EVENT: Record<string, BoostPaymentStatus> = {
  'payment.success': BoostPaymentStatus.SUCCEEDED,
  'payment.failed': BoostPaymentStatus.FAILED,
  'payment.cancelled': BoostPaymentStatus.CANCELLED,
  'payment.expired': BoostPaymentStatus.EXPIRED,
  'payment.refunded': BoostPaymentStatus.REFUNDED,
  'payment.initiated': BoostPaymentStatus.PENDING,
};

type ValidatedBoostMetadata = {
  postId: string;
  userId: string;
  days: number;
  amount: number;
};

@Injectable()
export class BoostPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geniusPayService: GeniusPayService,
  ) {}

  private mapWebhookEventToStatus(event?: string) {
    if (!event) {
      return undefined;
    }

    return PAYMENT_STATUS_BY_EVENT[event];
  }

  private parseBoostMetadata(
    metadata: Record<string, unknown>,
    fallbackAmount?: number,
  ): ValidatedBoostMetadata | null {
    const postId = String(metadata.postId ?? '').trim();
    const userId = String(metadata.userId ?? '').trim();
    const days = Number(metadata.days ?? 7);
    const amount = Number(metadata.amount ?? fallbackAmount ?? 0);

    if (
      !postId ||
      !userId ||
      !Number.isFinite(days) ||
      days <= 0 ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return null;
    }

    return {
      postId,
      userId,
      days: Math.trunc(days),
      amount,
    };
  }

  private shouldApplyWebhookStatus(
    currentStatus: BoostPaymentStatus,
    targetStatus: BoostPaymentStatus,
  ) {
    if (currentStatus === targetStatus) {
      return false;
    }

    if (currentStatus === BoostPaymentStatus.PENDING) {
      return targetStatus !== BoostPaymentStatus.PENDING;
    }

    if (currentStatus === BoostPaymentStatus.SUCCEEDED) {
      return targetStatus === BoostPaymentStatus.REFUNDED;
    }

    return false;
  }

  private computeBoostedUntil(currentBoostedUntil: Date | null, days: number): Date {
    const now = new Date();
    if (currentBoostedUntil && currentBoostedUntil.getTime() > now.getTime()) {
      return new Date(currentBoostedUntil.getTime() + days * 24 * 60 * 60 * 1000);
    }

    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private resolvePlan(dto: PayBoostDto): BoostPlan {
    const providedDays = dto.days;
    const providedAmount = dto.amount;

    if (!providedDays && !providedAmount) {
      return BOOST_PLANS[7];
    }

    if (providedDays) {
      const plan = BOOST_PLANS[providedDays];

      if (!plan) {
        throw new BadRequestException(
          'Forfait invalide. Choisissez 1, 3, 7 ou 20 jours.',
        );
      }

      if (providedAmount && providedAmount !== plan.amount) {
        throw new BadRequestException(
          `Le montant ${providedAmount} FCFA ne correspond pas au forfait ${providedDays} jours.`,
        );
      }

      return plan;
    }

    const plan = Object.values(BOOST_PLANS).find(
      (entry) => entry.amount === providedAmount,
    );

    if (!plan) {
      throw new BadRequestException(
        'Montant invalide. Montants autorisés: 200, 500, 1000, 2000 FCFA.',
      );
    }

    return plan;
  }

  private async getPostOwnership(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, boostedUntil: true, title: true, city: true },
    });

    if (!post) {
      throw new NotFoundException('Annonce non trouvée');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez booster que vos propres annonces');
    }

    return post;
  }

  async createBoostCheckout(postId: string, userId: string, dto: PayBoostDto) {
    const post = await this.getPostOwnership(postId, userId);
    const plan = this.resolvePlan(dto);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const description = `Boost annonce ${post.title} - ${plan.days} jour(s)`;

    const payment = await this.geniusPayService.createCheckoutPayment({
      amount: plan.amount,
      description,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      metadata: {
        postId,
        userId,
        days: plan.days,
        amount: plan.amount,
      },
      successUrl: process.env.GENIUSPAY_SUCCESS_URL,
    });

    const boostPayment = await this.prisma.boostPayment.create({
      data: {
        reference: payment.reference,
        checkoutUrl: payment.checkoutUrl,
        amount: plan.amount,
        days: plan.days,
        status: BoostPaymentStatus.PENDING,
        metadata: {
          postId,
          userId,
          days: plan.days,
          amount: plan.amount,
        } as Prisma.JsonObject,
        postId,
        userId,
      },
    });

    return {
      message: 'Paiement GeniusPay créé. Redirigez l’utilisateur vers checkoutUrl.',
      payment: {
        reference: boostPayment.reference,
        checkoutUrl: boostPayment.checkoutUrl,
        amount: boostPayment.amount,
        days: boostPayment.days,
        status: boostPayment.status,
      },
    };
  }

  async handleGeniusPayWebhook(rawBody: string | Buffer, headers: Record<string, any>, payload: any) {
    const signature = headers['x-webhook-signature'] ?? headers['X-Webhook-Signature'];
    const timestamp = headers['x-webhook-timestamp'] ?? headers['X-Webhook-Timestamp'];

    if (!this.geniusPayService.isWebhookTimestampFresh(String(timestamp ?? ''))) {
      throw new BadRequestException('Timestamp webhook GeniusPay expiré');
    }

    const isValid = this.geniusPayService.verifyWebhookSignature(
      rawBody,
      String(timestamp ?? ''),
      String(signature ?? ''),
    );

    if (!isValid) {
      throw new BadRequestException('Signature webhook GeniusPay invalide');
    }

    const webhookPayload = payload as GeniusPayWebhookPayload;
    const event = webhookPayload?.event;
    const eventId = webhookPayload?.id;
    const data = webhookPayload?.data ?? {};

    if (!eventId) {
      throw new BadRequestException('ID de webhook GeniusPay manquant');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingEvent = await tx.webhookEvent.findUnique({
          where: {
            provider_eventId: {
              provider: 'geniuspay',
              eventId,
            },
          },
        });

        if (existingEvent) {
          return { message: 'Webhook GeniusPay déjà traité', eventId };
        }

        await tx.webhookEvent.create({
          data: {
            provider: 'geniuspay',
            eventId,
            eventName: event ?? 'unknown',
            payload: webhookPayload as Prisma.JsonObject,
          },
        });

        if (!event?.startsWith('payment.')) {
          return { message: 'Webhook GeniusPay ignoré', event, eventId };
        }

        const reference = data?.reference;

        if (!reference) {
          throw new BadRequestException('Référence de paiement manquante dans le webhook');
        }

        const targetStatus = this.mapWebhookEventToStatus(event);

        if (!targetStatus) {
          return { message: `Webhook GeniusPay ignoré: ${event}` };
        }

        const boostPayment = await tx.boostPayment.findUnique({
          where: { reference },
          include: {
            post: { select: { id: true, boostedUntil: true } },
          },
        });

        const metadata = (data?.metadata ?? {}) as Record<string, unknown>;

        if (!boostPayment && targetStatus === BoostPaymentStatus.SUCCEEDED) {
          const validatedMetadata = this.parseBoostMetadata(metadata, data.amount);

          if (!validatedMetadata) {
            return { message: 'Paiement GeniusPay reçu mais metadata incomplètes', reference };
          }

          const post = await tx.post.findUnique({
            where: { id: validatedMetadata.postId },
            select: { boostedUntil: true },
          });

          if (!post) {
            return { message: 'Paiement GeniusPay reçu mais annonce introuvable', reference };
          }

          const user = await tx.user.findUnique({
            where: { id: validatedMetadata.userId },
            select: { id: true },
          });

          if (!user) {
            return { message: 'Paiement GeniusPay reçu mais utilisateur introuvable', reference };
          }

          const created = await tx.boostPayment.create({
            data: {
              reference,
              checkoutUrl: data.checkout_url ?? data.payment_url ?? null,
              amount: validatedMetadata.amount,
              days: validatedMetadata.days,
              status: BoostPaymentStatus.SUCCEEDED,
              metadata: {
                ...metadata,
                postId: validatedMetadata.postId,
                userId: validatedMetadata.userId,
                days: validatedMetadata.days,
                amount: validatedMetadata.amount,
              } as Prisma.JsonObject,
              postId: validatedMetadata.postId,
              userId: validatedMetadata.userId,
              completedAt: new Date(),
            },
          });

          const boostedUntil = this.computeBoostedUntil(post.boostedUntil, created.days);

          await tx.post.update({
            where: { id: created.postId },
            data: {
              boostedUntil,
              boostPaymentReference: reference,
              boostPaymentAmount: created.amount,
              boostPaidAt: new Date(),
            },
          });

          return { message: 'Boost activé via GeniusPay', reference };
        }

        if (!boostPayment) {
          return { message: 'Paiement GeniusPay inconnu', reference };
        }

        if (!this.shouldApplyWebhookStatus(boostPayment.status, targetStatus)) {
          return {
            message: `Webhook GeniusPay ignoré: ${event}`,
            reference,
            status: boostPayment.status,
          };
        }

        const updateData: Prisma.BoostPaymentUpdateInput = {
          status: targetStatus,
        };

        if (targetStatus === BoostPaymentStatus.SUCCEEDED) {
          const boostedUntil = this.computeBoostedUntil(
            boostPayment.post.boostedUntil,
            boostPayment.days,
          );

          updateData.completedAt = new Date();
          updateData.errorMessage = null;

          await tx.post.update({
            where: { id: boostPayment.postId },
            data: {
              boostedUntil,
              boostPaymentReference: reference,
              boostPaymentAmount: boostPayment.amount,
              boostPaidAt: new Date(),
            },
          });
        }

        if (
          targetStatus === BoostPaymentStatus.FAILED ||
          targetStatus === BoostPaymentStatus.CANCELLED ||
          targetStatus === BoostPaymentStatus.EXPIRED ||
          targetStatus === BoostPaymentStatus.REFUNDED
        ) {
          updateData.failedAt = new Date();
          updateData.errorMessage = data?.failure_reason ?? data?.reason ?? null;
        }

        await tx.boostPayment.update({
          where: { reference },
          data: updateData,
        });

        return { message: 'Webhook GeniusPay traité', reference, status: targetStatus };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { message: 'Webhook GeniusPay déjà traité', eventId };
      }

      throw error;
    }
  }
}
