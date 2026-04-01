import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

export enum ConditionEnum {
  NEUF = 'NEUF',
  QUASI_NEUF = 'QUASI_NEUF',
  RECONDITIONNE = 'RECONDITIONNE',
  SECONDE_MAIN = 'SECONDE_MAIN',
}

export enum CategoryEnum {
  PHONE = 'PHONE',
  PC = 'PC',
  AUTO_MOTO = 'AUTO_MOTO',
  AUTO_PARTS = 'AUTO_PARTS',
  MOTO_PARTS = 'MOTO_PARTS',
  AUTO_ACCESSORIES = 'AUTO_ACCESSORIES',
  AUTO_EQUIPMENT = 'AUTO_EQUIPMENT',
  APPLIANCES = 'APPLIANCES',
  FRIDGE_PARTS = 'FRIDGE_PARTS',
  WASHING_MACHINE_PARTS = 'WASHING_MACHINE_PARTS',
  AC_PARTS = 'AC_PARTS',
  MICROWAVE_PARTS = 'MICROWAVE_PARTS',
  HOME_DIY = 'HOME_DIY',
  TOOLS = 'TOOLS',
  ELECTRICAL_MATERIAL = 'ELECTRICAL_MATERIAL',
  PLUMBING = 'PLUMBING',
  CARPENTRY = 'CARPENTRY',
  ENERGY_INDUSTRY = 'ENERGY_INDUSTRY',
  GENERATORS = 'GENERATORS',
  SOLAR_PANELS = 'SOLAR_PANELS',
  INDUSTRIAL_BATTERIES = 'INDUSTRIAL_BATTERIES',
  INDUSTRIAL_MACHINE_PARTS = 'INDUSTRIAL_MACHINE_PARTS',
  MULTIMEDIA_GAMING = 'MULTIMEDIA_GAMING',
  CONSOLES = 'CONSOLES',
  CONTROLLERS = 'CONTROLLERS',
  CONSOLE_PARTS = 'CONSOLE_PARTS',
  GAMING_ACCESSORIES = 'GAMING_ACCESSORIES',
  OTHER_VEHICLES = 'OTHER_VEHICLES',
  BICYCLE = 'BICYCLE',
  SCOOTER = 'SCOOTER',
  VARIOUS_PARTS = 'VARIOUS_PARTS',
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
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ConditionEnum, { message: 'Condition invalide (NEUF, QUASI_NEUF, RECONDITIONNE, SECONDE_MAIN)' })
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
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(CategoryEnum, { message: 'Catégorie invalide' })
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
