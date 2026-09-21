import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { NotificationsService } from './notifications.service';
import { ExpoPushService } from './expo-push.service';
import {
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
} from './dto/push-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly expoPushService: ExpoPushService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes notifications' })
  @ApiResponse({ status: 200, description: 'Notifications paginées' })
  getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() filters: FilterNotificationsDto,
  ) {
    return this.notificationsService.getMyNotifications(userId, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  @ApiResponse({
    status: 200,
    description: 'Compteur de notifications non lues',
  })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post('push-token')
  @ApiOperation({
    summary: 'Enregistrer le token Expo Push de cet appareil',
  })
  registerPushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.expoPushService.registerToken(userId, dto);
  }

  @Delete('push-token')
  @ApiOperation({
    summary: 'Supprimer le token Expo Push (à appeler à la déconnexion)',
  })
  unregisterPushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UnregisterPushTokenDto,
  ) {
    return this.expoPushService.unregisterToken(userId, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
