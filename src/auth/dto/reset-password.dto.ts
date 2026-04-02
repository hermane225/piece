import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: '123456',
    description: 'Code de réinitialisation reçu par email',
  })
  @IsNotEmpty({ message: 'Le code est requis' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NouveauMotDePasse123', description: 'Nouveau mot de passe (min 6 caractères)' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}
