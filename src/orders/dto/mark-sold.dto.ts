import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkSoldDto {
  @ApiProperty({
    description: "ID de l'acheteur (l'autre participant de la conversation)",
    example: 'a3f1f564-16f7-4ccc-8ce7-8b393c3f517d',
  })
  @IsUUID('all')
  buyerId: string;

  @ApiPropertyOptional({
    example: 15000,
    description:
      "Prix convenu avec l'acheteur (FCFA). Par défaut, le prix affiché de l'annonce.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price?: number;
}
