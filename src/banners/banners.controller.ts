import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

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
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
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
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
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
