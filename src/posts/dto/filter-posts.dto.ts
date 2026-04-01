import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ConditionEnum, CategoryEnum } from './create-post.dto';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

export class FilterPostsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Apple', description: 'Filtrer par marque' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Abidjan', description: 'Filtrer par ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: CategoryEnum, description: 'Filtrer par catégorie' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(CategoryEnum)
  category?: CategoryEnum;

  @ApiPropertyOptional({ enum: ConditionEnum, description: 'Filtrer par condition' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ConditionEnum)
  condition?: ConditionEnum;

  @ApiPropertyOptional({ example: 5000, description: 'Prix minimum' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Prix maximum' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'écran iPhone', description: 'Recherche par mot-clé' })
  @IsOptional()
  @IsString()
  search?: string;
}
