import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { memoryStorage } from 'multer';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CloudinaryController {
  private readonly logger = new Logger(CloudinaryController.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('images')
  @ApiOperation({ summary: 'Upload d\'images (max 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploadées avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        urls: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    this.logger.debug(
      `uploadImages called: ${files?.length ?? 0} fichiers reçus`,
    );

    if (!files || files.length === 0) {
      this.logger.warn('uploadImages: aucun fichier reçu');
    } else {
      files.forEach((file, idx) => {
        this.logger.debug(
          `File ${idx}: name=${file.originalname}, size=${file.size}, mime=${file.mimetype}`,
        );
      });
    }

    const urls = await this.cloudinaryService.uploadMultipleImages(files);
    return {
      message: 'Images uploadées avec succès',
      urls,
    };
  }
}
