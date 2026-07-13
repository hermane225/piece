import { BoostPaymentStatus } from '@prisma/client';
import { BoostPaymentsService } from './boost-payments.service';

describe('BoostPaymentsService', () => {
  const createTxMock = () => ({
    webhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    boostPayment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  });

  let prismaMock: { $transaction: jest.Mock };
  let geniusPayServiceMock: {
    isWebhookTimestampFresh: jest.Mock;
    verifyWebhookSignature: jest.Mock;
  };
  let txMock: ReturnType<typeof createTxMock>;
  let service: BoostPaymentsService;

  const buildWebhookPayload = (overrides: Partial<Record<string, unknown>> = {}) => {
    const payload = {
      id: 'evt_123',
      event: 'payment.success',
      data: {
        reference: 'PAY-123',
        amount: 1000,
        checkout_url: 'https://example.com/checkout',
        payment_url: 'https://example.com/payment',
        metadata: {
          postId: 'post_1',
          userId: 'user_1',
          days: 7,
          amount: 1000,
        },
      },
      ...overrides,
    };

    return payload;
  };

  beforeEach(() => {
    txMock = createTxMock();
    prismaMock = {
      $transaction: jest.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
      ),
    };
    geniusPayServiceMock = {
      isWebhookTimestampFresh: jest.fn().mockReturnValue(true),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    service = new BoostPaymentsService(prismaMock as never, geniusPayServiceMock as never);
  });

  it('ignores an initiated webhook after a success', async () => {
    const payload = buildWebhookPayload({
      event: 'payment.initiated',
    });

    txMock.webhookEvent.findUnique.mockResolvedValue(null);
    txMock.webhookEvent.create.mockResolvedValue({});
    txMock.boostPayment.findUnique.mockResolvedValue({
      reference: 'PAY-123',
      status: BoostPaymentStatus.SUCCEEDED,
      days: 7,
      amount: 1000,
      postId: 'post_1',
      userId: 'user_1',
      post: {
        boostedUntil: new Date('2026-07-20T00:00:00.000Z'),
      },
    });

    const result = await service.handleGeniusPayWebhook(
      Buffer.from(JSON.stringify(payload)),
      {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      },
      payload,
    );

    expect(result).toEqual({
      message: 'Webhook GeniusPay ignoré: payment.initiated',
      reference: 'PAY-123',
      status: BoostPaymentStatus.SUCCEEDED,
    });
    expect(txMock.post.update).not.toHaveBeenCalled();
    expect(txMock.boostPayment.update).not.toHaveBeenCalled();
  });

  it('does not create a boost payment when success metadata is missing', async () => {
    const payload = buildWebhookPayload({
      data: {
        reference: 'PAY-123',
        amount: 1000,
        checkout_url: 'https://example.com/checkout',
        payment_url: 'https://example.com/payment',
        metadata: {},
      },
    });

    txMock.webhookEvent.findUnique.mockResolvedValue(null);
    txMock.webhookEvent.create.mockResolvedValue({});
    txMock.boostPayment.findUnique.mockResolvedValue(null);

    const result = await service.handleGeniusPayWebhook(
      Buffer.from(JSON.stringify(payload)),
      {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      },
      payload,
    );

    expect(result).toEqual({
      message: 'Paiement GeniusPay reçu mais metadata incomplètes',
      reference: 'PAY-123',
    });
    expect(txMock.boostPayment.create).not.toHaveBeenCalled();
    expect(txMock.post.findUnique).not.toHaveBeenCalled();
    expect(txMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('creates and activates a boost when a success webhook has valid metadata', async () => {
    const payload = buildWebhookPayload();

    txMock.webhookEvent.findUnique.mockResolvedValue(null);
    txMock.webhookEvent.create.mockResolvedValue({});
    txMock.boostPayment.findUnique.mockResolvedValue(null);
    txMock.post.findUnique.mockResolvedValue({
      boostedUntil: new Date('2026-07-20T00:00:00.000Z'),
    });
    txMock.user.findUnique.mockResolvedValue({ id: 'user_1' });
    txMock.boostPayment.create.mockResolvedValue({
      reference: 'PAY-123',
      checkoutUrl: 'https://example.com/checkout',
      amount: 1000,
      days: 7,
      status: BoostPaymentStatus.SUCCEEDED,
      postId: 'post_1',
      userId: 'user_1',
    });
    txMock.post.update.mockResolvedValue({});

    const result = await service.handleGeniusPayWebhook(
      Buffer.from(JSON.stringify(payload)),
      {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      },
      payload,
    );

    expect(result).toEqual({
      message: 'Boost activé via GeniusPay',
      reference: 'PAY-123',
    });
    expect(txMock.boostPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reference: 'PAY-123',
        amount: 1000,
        days: 7,
        status: BoostPaymentStatus.SUCCEEDED,
        postId: 'post_1',
        userId: 'user_1',
      }),
    });
    expect(txMock.post.update).toHaveBeenCalledWith({
      where: { id: 'post_1' },
      data: expect.objectContaining({
        boostPaymentReference: 'PAY-123',
        boostPaymentAmount: 1000,
      }),
    });
  });
});
