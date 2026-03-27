import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({ description: 'Titre de la banniere' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: "URL de l'image de la banniere (ou fichier si multipart)",
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Commentaire optionnel' })
  @IsOptional()
  @IsString()
  comment?: string;
}
