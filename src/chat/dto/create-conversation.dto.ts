import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    type: [String],
    description: 'Liste des IDs utilisateurs à inclure dans la conversation',
    example: ['a3f1f564-16f7-4ccc-8ce7-8b393c3f517d'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  participantIds: string[];
}
