  // ...existing code...
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
  UploadedFiles,
  UseInterceptors,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une annonce' })
  @ApiResponse({ status: 201, description: 'Annonce créée' })
  @UseInterceptors(FilesInterceptor('images', 5))
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Upload des images si présentes
    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      imageUrls = await this.cloudinaryService.uploadMultipleImages(files);
    }
    // On écrase dto.images si upload
    return this.postsService.create(userId, { ...dto, images: imageUrls });
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
  @ApiOperation({ summary: "Détail d'une annonce" })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, description: 'Détail annonce' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une annonce (propriétaire uniquement)' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, description: 'Annonce mise à jour' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une annonce (propriétaire uniquement)' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, description: 'Annonce supprimée' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.postsService.remove(id, userId);
  }
  @Patch(':id/boost')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Booster une annonce (payant, simulation)' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, description: 'Annonce boostée' })
  async boostPost(
    @Param('id') id: string, @CurrentUser('id') userId: string
  ) {
    // Simulation paiement validé : boost 7 jours
    return this.postsService.boostPost(id, userId, 7);
  }
}
