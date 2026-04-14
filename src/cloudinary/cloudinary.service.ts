import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!file) {
      this.logger.warn('uploadImage: aucun fichier fourni');
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier le type de fichier
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      this.logger.warn(
        `uploadImage: type MIME non supporté: ${file.originalname} (${file.mimetype})`,
      );
      throw new BadRequestException(
        'Format de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.',
      );
    }

    // Limite de taille : 5MB
    if (file.size > 5 * 1024 * 1024) {
      this.logger.warn(
        `uploadImage: fichier trop volumineux: ${file.originalname} (${file.size} bytes)`,
      );
      throw new BadRequestException('Le fichier ne doit pas dépasser 5MB');
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'piece-rare',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `uploadImage: erreur Cloudinary: ${error.message}`,
              error,
            );
            return reject(error);
          }

          this.logger.debug(`uploadImage: succès - ${result?.public_id}`);
          resolve(result!);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      this.logger.warn('uploadMultipleImages: aucun fichier fourni');
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (files.length > 5) {
      this.logger.warn(
        `uploadMultipleImages: trop de fichiers (${files.length} > 5)`,
      );
      throw new BadRequestException('Maximum 5 images par annonce');
    }

    this.logger.log(
      `uploadMultipleImages: traitement de ${files.length} fichiers`,
    );

    const uploadPromises = files.map((file) => this.uploadImage(file));
    const results = await Promise.all(uploadPromises);

    const urls = results.map((result) => result.secure_url);
    this.logger.log(`uploadMultipleImages: ${urls.length} URLs retournées`);

    return urls;
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
