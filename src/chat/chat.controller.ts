import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatPaginationDto } from './dto/chat-pagination.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Créer (ou retrouver) une conversation et envoyer un message initial optionnel' })
  @ApiResponse({ status: 201, description: 'Conversation créée' })
  createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lister mes conversations' })
  getMyConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getMyConversations(userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lister les messages d’une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query() pagination: ChatPaginationDto,
  ) {
    return this.chatService.getConversationMessages(userId, conversationId, pagination);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Envoyer un message dans une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, conversationId, dto);
  }

  @Patch('conversations/:id/messages/read')
  @ApiOperation({ summary: 'Marquer les messages reçus comme lus' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.markMessagesAsRead(userId, conversationId);
  }
}
