import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GeniusPayService } from './geniuspay.service';
import { BoostPaymentsService } from './boost-payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [GeniusPayService, BoostPaymentsService],
  exports: [GeniusPayService, BoostPaymentsService],
})
export class PaymentsModule {}
