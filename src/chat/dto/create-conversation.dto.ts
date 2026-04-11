import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
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
}
