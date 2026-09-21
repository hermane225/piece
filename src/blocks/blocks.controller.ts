import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BlocksService } from './blocks.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get('blocked')
  @ApiOperation({ summary: 'Lister les utilisateurs que j’ai bloqués' })
  listBlocked(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.blocksService.listBlocked(userId, pagination);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Bloquer un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur à bloquer" })
  @ApiResponse({ status: 201, description: 'Utilisateur bloqué' })
  block(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.blocksService.block(userId, targetId);
  }

  @Delete(':id/block')
  @ApiOperation({ summary: 'Débloquer un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur à débloquer" })
  unblock(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.blocksService.unblock(userId, targetId);
  }
}
