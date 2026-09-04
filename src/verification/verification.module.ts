import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [CloudinaryModule, NotificationsModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
