import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BoostPaymentsService } from './boost-payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly boostPaymentsService: BoostPaymentsService) {}

  @Post('geniuspay/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook GeniusPay pour confirmer les paiements boost' })
  @ApiResponse({ status: 200, description: 'Webhook traité' })
  handleGeniusPayWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers() headers: Record<string, any>,
    @Body() payload: any,
  ) {
    // GeniusPay recommande une réponse rapide; on valide et persiste d'abord l'événement, puis on retourne 200.
    return this.boostPaymentsService.handleGeniusPayWebhook(
      req.rawBody ?? Buffer.from(JSON.stringify(payload ?? {})),
      headers,
      payload,
    );
  }
}