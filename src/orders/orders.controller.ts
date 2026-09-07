import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('my')
  @ApiOperation({ summary: 'Lister mes commandes (achats et ventes)' })
  @ApiResponse({ status: 200, description: 'Mes commandes' })
  findMyOrders(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.ordersService.findMyOrders(userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une commande" })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  @ApiResponse({ status: 200, description: 'Détail commande' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Patch(':id/confirm-reception')
  @ApiOperation({ summary: 'Confirmer la réception (acheteur uniquement)' })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  @ApiResponse({ status: 200, description: 'Réception confirmée' })
  confirmReception(
    @Param('id') id: string,
    @CurrentUser('id') buyerId: string,
  ) {
    return this.ordersService.confirmReception(id, buyerId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler la commande (vendeur uniquement)' })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  @ApiResponse({ status: 200, description: 'Commande annulée' })
  cancel(@Param('id') id: string, @CurrentUser('id') sellerId: string) {
    return this.ordersService.cancel(id, sellerId);
  }
}
