import { IsOptional } from 'class-validator';

/**
 * DTO pour l'upload d'images (multipart/form-data).
 * Les fichiers sont gérés directement par FilesInterceptor,
 * ce DTO existe pour passer la validation globale.
 */
export class UploadImagesDto {
  @IsOptional()
  files?: Express.Multer.File[];
}
