import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FilterNotificationsDto {
  @ApiPropertyOptional({ default: 1, description: 'Numéro de page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Taille de la page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrer sur lu/non lu',
    type: String,
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isRead?: 'true' | 'false';
}
