import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTechnicianDto } from './dto/create-technician.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de la plateforme' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('posts/pending')
  @ApiOperation({ summary: 'Liste des annonces en attente de validation' })
  @ApiResponse({ status: 200, description: 'Annonces en attente' })
  getPendingPosts(@Query() pagination: PaginationDto) {
    return this.adminService.getPendingPosts(pagination);
  }

  @Patch('posts/:id/approve')
  @ApiOperation({ summary: 'Approuver une annonce' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, description: 'Annonce approuvée' })
  approvePost(@Param('id') id: string) {
    return this.adminService.approvePost(id);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Supprimer une annonce (admin)' })
  @ApiParam({ name: 'id', description: "ID de l'annonce" })
  @ApiResponse({ status: 200, description: 'Annonce supprimée' })
  deletePost(@Param('id') id: string) {
    return this.adminService.deletePost(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Liste de tous les utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  getAllUsers(@Query() pagination: PaginationDto) {
    return this.adminService.getAllUsers(pagination);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Bannir / supprimer un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // Technician Management Endpoints
  @Post('technicians')
  @ApiOperation({ summary: 'Créer un nouveau technicien' })
  @ApiResponse({ status: 201, description: 'Technicien créé avec succès' })
  createTechnician(@Body() dto: CreateTechnicianDto, @Req() req: any) {
    return this.adminService.createTechnician(dto, req.user.id);
  }

  @Get('technicians')
  @ApiOperation({ summary: 'Lister tous les techniciens' })
  @ApiResponse({ status: 200, description: 'Liste des techniciens' })
  getTechnicians(@Query() pagination: PaginationDto) {
    return this.adminService.getTechnicians(pagination);
  }

  @Get('technicians/:id')
  @ApiOperation({ summary: "Obtenir les détails d'un technicien" })
  @ApiParam({ name: 'id', description: 'ID du technicien' })
  @ApiResponse({ status: 200, description: 'Détails du technicien' })
  getTechnicianById(@Param('id') id: string) {
    return this.adminService.getTechnicianById(id);
  }

  @Patch('technicians/:id')
  @ApiOperation({ summary: 'Mettre à jour un technicien' })
  @ApiParam({ name: 'id', description: 'ID du technicien' })
  @ApiResponse({ status: 200, description: 'Technicien mis à jour' })
  updateTechnician(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTechnicianDto>,
  ) {
    return this.adminService.updateTechnician(id, dto);
  }

  @Delete('technicians/:id')
  @ApiOperation({ summary: 'Supprimer un technicien' })
  @ApiParam({ name: 'id', description: 'ID du technicien' })
  @ApiResponse({ status: 200, description: 'Technicien supprimé' })
  deleteTechnician(@Param('id') id: string) {
    return this.adminService.deleteTechnician(id);
  }

  @Patch('technicians/:id/toggle-status')
  @ApiOperation({ summary: 'Activer/Désactiver un technicien' })
  @ApiParam({ name: 'id', description: 'ID du technicien' })
  @ApiResponse({ status: 200, description: 'Statut du technicien basculé' })
  toggleTechnicianStatus(@Param('id') id: string) {
    return this.adminService.toggleTechnicianStatus(id);
  }
}
