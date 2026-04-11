import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { TrackSearchDto } from './dto/track-search.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Récupérer mes préférences de catégories' })
  getPreferences(@CurrentUser('id') userId: string) {
    return this.recommendationsService.getMyPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Enregistrer mes préférences de catégories' })
  @ApiResponse({ status: 200, description: 'Préférences mises à jour' })
  upsertPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertPreferencesDto,
  ) {
    return this.recommendationsService.upsertPreferences(userId, dto);
  }

  @Post('searches')
  @ApiOperation({
    summary: 'Enregistrer une recherche utilisateur et déclencher une alerte suggestion',
  })
  trackSearch(@CurrentUser('id') userId: string, @Body() dto: TrackSearchDto) {
    return this.recommendationsService.trackSearch(userId, dto);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Récupérer des annonces recommandées' })
  getRecommendedPosts(
    @CurrentUser('id') userId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationsService.getSuggestionsForUser(userId, query);
  }
}
