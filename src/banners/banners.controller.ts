import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { memoryStorage } from 'multer';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── Route publique : tout le monde peut voir les bannières actives ──
  @Get()
  @ApiOperation({ summary: 'Lister les bannières actives (public)' })
  @ApiResponse({ status: 200, description: 'Liste des bannières' })
  findAll() {
    return this.bannersService.findAll();
  }

  // ── Routes admin uniquement ──
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une bannière (admin)' })
  @ApiResponse({ status: 201, description: 'Bannière créée' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        comment: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
      required: ['title', 'image'],
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
    }),
  )
  async create(
    @Body() dto: CreateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl = dto.image;
    if (file) {
      const uploaded = await this.cloudinaryService.uploadImage(file);
      imageUrl = uploaded.secure_url;
    }
    if (!imageUrl) {
      throw new BadRequestException('image is required (file or url)');
    }
    return this.bannersService.create({ ...dto, image: imageUrl });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une bannière' })
  @ApiParam({ name: 'id', description: 'ID de la bannière' })
  @ApiResponse({ status: 200, description: 'Détail bannière' })
  @ApiResponse({ status: 404, description: 'Bannière non trouvée' })
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une bannière (admin)' })
  @ApiParam({ name: 'id', description: 'ID de la bannière' })
  @ApiResponse({ status: 200, description: 'Bannière mise à jour' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        comment: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl = dto.image;
    if (file) {
      const uploaded = await this.cloudinaryService.uploadImage(file);
      imageUrl = uploaded.secure_url;
    }
    const payload = imageUrl ? { ...dto, image: imageUrl } : dto;
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('no fields to update');
    }
    return this.bannersService.update(id, payload);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une bannière (admin)' })
  @ApiParam({ name: 'id', description: 'ID de la bannière' })
  @ApiResponse({ status: 200, description: 'Bannière supprimée' })
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
