import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBannerDto {
  @ApiPropertyOptional({ description: 'Titre de la bannière' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'URL de l\'image de la bannière' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Commentaire optionnel' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Activer/désactiver la bannière' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
