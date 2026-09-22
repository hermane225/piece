import { Module } from '@nestjs/common';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';
import { TechnicianReviewsController } from './technician-reviews.controller';
import { TechnicianReviewsService } from './technician-reviews.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TechniciansController, TechnicianReviewsController],
  providers: [TechniciansService, TechnicianReviewsService],
})
export class TechniciansModule {}
