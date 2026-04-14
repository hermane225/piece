import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PresenceBatchDto } from './dto/presence-batch.dto';
import { PresenceService } from './presence.service';

@ApiTags('Presence')
@Controller('presence')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('batch')
  @ApiOperation({ summary: 'Récupérer la présence par lot (fallback REST)' })
  @ApiResponse({ status: 201, description: 'Snapshot de présence retourné' })
  getBatch(@CurrentUser('id') userId: string, @Body() dto: PresenceBatchDto) {
    return this.presenceService.getBatch(userId, dto.userIds);
  }
}