import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Note de 1 à 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Vendeur sérieux, pièce conforme à la description.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
