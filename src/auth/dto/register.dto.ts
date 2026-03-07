import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Nom complet' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email unique' })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({ example: '+2250700000000', description: 'Téléphone unique' })
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'MotDePasse123', description: 'Mot de passe (min 6 caractères)' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @ApiProperty({ example: 'Abidjan', description: 'Ville' })
  @IsNotEmpty({ message: 'La ville est requise' })
  @IsString()
  city: string;
}
