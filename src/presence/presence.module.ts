import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PresenceController } from './presence.controller';
import { PresenceGateway } from './presence.gateway';
import { PresenceBusService } from './presence-bus.service';
import { PresenceCacheService } from './presence-cache.service';
import { PresenceService } from './presence.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PresenceController],
  providers: [
    PresenceBusService,
    PresenceCacheService,
    PresenceService,
    PresenceGateway,
  ],
})
export class PresenceModule {}