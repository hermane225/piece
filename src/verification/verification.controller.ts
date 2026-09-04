import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soumettre une demande de vérification vendeur (optionnel)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentType: { type: 'string', enum: ['CNI', 'PERMIS', 'AUTRE'] },
        document: { type: 'string', format: 'binary' },
      },
      required: ['documentType', 'document'],
    },
  })
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  submit(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitVerificationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.verificationService.submit(userId, dto, file);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statut de ma demande de vérification' })
  getMyStatus(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyStatus(userId);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lister les demandes de vérification en attente (admin)',
  })
  getPendingRequests(@Query() pagination: PaginationDto) {
    return this.verificationService.getPendingRequests(pagination);
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver une demande de vérification (admin)' })
  @ApiParam({ name: 'id', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande approuvée' })
  approve(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.verificationService.approve(id, adminId);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refuser une demande de vérification (admin)' })
  @ApiParam({ name: 'id', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande refusée' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectVerificationDto,
  ) {
    return this.verificationService.reject(id, adminId, dto);
  }
}
