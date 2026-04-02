import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: '9f3cb5699724f0a5f0d062219fd0f673f9a67ae6cd2f2c6d6eeb5a07a9843c65',
    description: 'Token reçu pour la réinitialisation',
  })
  @IsNotEmpty({ message: 'Le token est requis' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NouveauMotDePasse123', description: 'Nouveau mot de passe (min 6 caractères)' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}
