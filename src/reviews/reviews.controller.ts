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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('orders/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Laisser un avis sur la contrepartie d’une commande terminée',
  })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  @ApiResponse({ status: 201, description: 'Avis publié' })
  create(
    @Param('id') orderId: string,
    @CurrentUser('id') authorId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(orderId, authorId, dto);
  }

  @Get('users/:id/reviews')
  @ApiOperation({
    summary: 'Lister les avis reçus par un utilisateur (public)',
  })
  @ApiParam({ name: 'id', description: 'ID utilisateur' })
  @ApiResponse({ status: 200, description: 'Avis et note moyenne' })
  findForUser(@Param('id') userId: string, @Query() pagination: PaginationDto) {
    return this.reviewsService.findForUser(userId, pagination);
  }
}
