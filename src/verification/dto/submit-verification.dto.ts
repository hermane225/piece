import { ApiProperty } from '@nestjs/swagger';
import { VerificationDocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SubmitVerificationDto {
  @ApiProperty({ enum: VerificationDocumentType, example: 'CNI' })
  @IsEnum(VerificationDocumentType)
  documentType: VerificationDocumentType;
}
