import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Contenu textuel du message',
    maxLength: 2000,
    example: 'Bonjour, votre pièce est toujours disponible ?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
