import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectVerificationDto {
  @ApiProperty({
    example: 'Document illisible, merci de renvoyer une photo nette.',
  })
  @IsNotEmpty({ message: 'Le motif est requis' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
