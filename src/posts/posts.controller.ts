import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une annonce' })
  @ApiResponse({ status: 201, description: 'Annonce créée' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les annonces (public, avec filtres et pagination)' })
  @ApiResponse({ status: 200, description: 'Liste des annonces approuvées' })
  findAll(@Query() filters: FilterPostsDto) {
    return this.postsService.findAll(filters);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister mes annonces' })
  @ApiResponse({ status: 200, description: 'Mes annonces' })
  findMyPosts(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.postsService.findMyPosts(userId, pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une annonce' })
  @ApiParam({ name: 'id', description: 'ID de l\'annonce' })
  @ApiResponse({ status: 200, description: 'Détail annonce' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une annonce (propriétaire uniquement)' })
  @ApiParam({ name: 'id', description: 'ID de l\'annonce' })
  @ApiResponse({ status: 200, description: 'Annonce mise à jour' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une annonce (propriétaire uniquement)' })
  @ApiParam({ name: 'id', description: 'ID de l\'annonce' })
  @ApiResponse({ status: 200, description: 'Annonce supprimée' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.postsService.remove(id, userId);
  }
}
