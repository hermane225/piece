import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({ description: 'Titre de la bannière' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'URL de l\'image de la bannière' })
  @IsString()
  image: string;

  @ApiPropertyOptional({ description: 'Commentaire optionnel' })
  @IsOptional()
  @IsString()
  comment?: string;
}
