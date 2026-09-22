import {
  Body,
  Controller,
  Get,
  Param,
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
import { TechnicianReviewsService } from './technician-reviews.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Technicians')
@Controller('technicians')
export class TechnicianReviewsController {
  constructor(private readonly reviewsService: TechnicianReviewsService) {}

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Laisser un avis sur la fiche d'un technicien" })
  @ApiParam({ name: 'id', description: 'ID du technicien' })
  @ApiResponse({ status: 201, description: 'Avis publié' })
  @ApiResponse({ status: 400, description: 'Avis déjà laissé' })
  @ApiResponse({ status: 403, description: 'Auto-évaluation interdite' })
  create(
    @Param('id') technicianId: string,
    @CurrentUser('id') authorId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(technicianId, authorId, dto);
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Lister les avis reçus par un technicien (public)',
  })
  @ApiParam({ name: 'id', description: 'ID du technicien' })
  @ApiResponse({ status: 200, description: 'Avis et note moyenne' })
  findForTechnician(
    @Param('id') technicianId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewsService.findForTechnician(technicianId, pagination);
  }
}
