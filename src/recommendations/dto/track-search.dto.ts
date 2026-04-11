import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackSearchDto {
  @ApiProperty({
    description: 'Texte recherché par l’utilisateur',
    example: 'moteur toyota corolla',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  query: string;

  @ApiPropertyOptional({ enum: Category, description: 'Catégorie ciblée' })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;
}
