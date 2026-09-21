import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Signaler un utilisateur, un message ou une annonce',
  })
  @ApiResponse({ status: 201, description: 'Signalement enregistré' })
  @ApiResponse({ status: 409, description: 'Déjà signalé' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(userId, dto);
  }
}
