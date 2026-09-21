import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlocksModule } from '../blocks/blocks.module';
import { ChatBusService } from './chat-bus.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    NotificationsModule,
    BlocksModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatBusService, ChatGateway],
})
export class ChatModule {}
