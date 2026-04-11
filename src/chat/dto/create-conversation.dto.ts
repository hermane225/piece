import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Liste des IDs utilisateurs à inclure dans la conversation',
    example: ['a3f1f564-16f7-4ccc-8ce7-8b393c3f517d'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  participantIds?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Compatibilité front: ID unique du destinataire',
    example: 'a3f1f564-16f7-4ccc-8ce7-8b393c3f517d',
  })
  @IsOptional()
  @IsUUID('all')
  participantId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Compatibilité legacy: userId du destinataire',
    example: 'a3f1f564-16f7-4ccc-8ce7-8b393c3f517d',
  })
  @IsOptional()
  @IsUUID('all')
  userId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'ID annonce depuis la page détail (optionnel)',
    example: 'b46f14ac-c4f0-4f7f-8f2e-91f7c8f5d4f4',
  })
  @IsOptional()
  @IsUUID('all')
  postId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Message initial à envoyer automatiquement (optionnel)',
    example: 'Bonjour, cette pièce est-elle toujours disponible ?',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  initialMessage?: string;
}
