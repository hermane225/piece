import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BoostPaymentsService } from './boost-payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly boostPaymentsService: BoostPaymentsService) {}

  @Post('geniuspay/webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook GeniusPay pour confirmer les paiements boost',
  })
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

  @Get('geniuspay/status/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Vérifier le statut d'un paiement GeniusPay (retour de checkout)",
  })
  @ApiParam({
    name: 'reference',
    description: 'Référence du paiement GeniusPay',
  })
  @ApiResponse({ status: 200, description: 'Statut du paiement' })
  getBoostPaymentStatus(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boostPaymentsService.getBoostPaymentStatus(reference, userId);
  }
}
