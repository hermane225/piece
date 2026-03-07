import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConditionEnum {
  NEUF = 'NEUF',
  QUASI_NEUF = 'QUASI_NEUF',
  RECONDITIONNE = 'RECONDITIONNE',
}

export enum CategoryEnum {
  PHONE = 'PHONE',
  PC = 'PC',
}

export class CreatePostDto {
  @ApiProperty({ example: 'Écran iPhone 14 Pro Max', description: 'Titre de l\'annonce' })
  @IsNotEmpty({ message: 'Le titre est requis' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Écran original en très bon état', description: 'Description' })
  @IsNotEmpty({ message: 'La description est requise' })
  @IsString()
  description: string;

  @ApiProperty({ example: 25000, description: 'Prix en FCFA' })
  @IsNotEmpty({ message: 'Le prix est requis' })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiProperty({ enum: ConditionEnum, example: 'NEUF', description: 'État de la pièce' })
  @IsNotEmpty({ message: 'La condition est requise' })
  @IsEnum(ConditionEnum, { message: 'Condition invalide (NEUF, QUASI_NEUF, RECONDITIONNE)' })
  condition: ConditionEnum;

  @ApiProperty({ example: 'Apple', description: 'Marque' })
  @IsNotEmpty({ message: 'La marque est requise' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'iPhone 14 Pro Max', description: 'Modèle' })
  @IsNotEmpty({ message: 'Le modèle est requis' })
  @IsString()
  model: string;

  @ApiProperty({ enum: CategoryEnum, example: 'PHONE', description: 'Catégorie' })
  @IsNotEmpty({ message: 'La catégorie est requise' })
  @IsEnum(CategoryEnum, { message: 'Catégorie invalide (PHONE, PC)' })
  category: CategoryEnum;

  @ApiProperty({ example: 'Abidjan', description: 'Ville' })
  @IsNotEmpty({ message: 'La ville est requise' })
  @IsString()
  city: string;

  @ApiPropertyOptional({
    example: ['https://res.cloudinary.com/xxx/image.jpg'],
    description: 'URLs des images',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
