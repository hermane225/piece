import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConditionEnum, CategoryEnum } from './create-post.dto';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

export class UpdatePostDto {
  @ApiPropertyOptional({ example: 'Écran iPhone 14 Pro Max', description: 'Titre' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Écran original neuf', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 30000, description: 'Prix en FCFA' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ enum: ConditionEnum, description: 'État' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ConditionEnum)
  condition?: ConditionEnum;

  @ApiPropertyOptional({ example: 'Apple', description: 'Marque' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'iPhone 14 Pro Max', description: 'Modèle' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ enum: CategoryEnum, description: 'Catégorie' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(CategoryEnum)
  category?: CategoryEnum;

  @ApiPropertyOptional({ example: 'Abidjan', description: 'Ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ type: [String], description: 'URLs des images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
