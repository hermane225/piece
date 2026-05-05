import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TechnicianSpecialtyEnum {
  COMPUTER_REPAIR = 'COMPUTER_REPAIR',
  PLUMBER = 'PLUMBER',
  ELECTRICIAN = 'ELECTRICIAN',
  CARPENTER = 'CARPENTER',
  AC_TECHNICIAN = 'AC_TECHNICIAN',
  APPLIANCES_REPAIR = 'APPLIANCES_REPAIR',
  AUTO_REPAIR = 'AUTO_REPAIR',
  MOTO_REPAIR = 'MOTO_REPAIR',
  SOLAR_INSTALLATION = 'SOLAR_INSTALLATION',
  ELECTRICAL_EQUIPMENT = 'ELECTRICAL_EQUIPMENT',
  INDUSTRIAL_EQUIPMENT = 'INDUSTRIAL_EQUIPMENT',
  GAMING_CONSOLE_REPAIR = 'GAMING_CONSOLE_REPAIR',
  OTHER = 'OTHER',
}

export class CreateTechnicianDto {
  @ApiProperty({ example: 'Jean Dupont' })
  @IsNotEmpty({ message: 'Le nom du technicien est obligatoire' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+33612345678' })
  @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{10,}$/, { message: 'Format de téléphone invalide' })
  phone: string;

  @ApiProperty({ enum: TechnicianSpecialtyEnum })
  @IsNotEmpty({ message: 'La spécialité est obligatoire' })
  @IsEnum(TechnicianSpecialtyEnum)
  specialty: TechnicianSpecialtyEnum;

  @ApiProperty({ example: 'Paris' })
  @IsNotEmpty({ message: 'La ville est obligatoire' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'jean@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '10 ans d\'expérience en réparation Apple' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '123 Rue de la Paix, 75000 Paris' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Certifié Apple, Agrégé RGE' })
  @IsOptional()
  @IsString()
  certifications?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(70)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: 50.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({
    example: { monday: '09:00-18:00', tuesday: '09:00-18:00', saturday: '09:00-13:00', sunday: 'closed' },
  })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
