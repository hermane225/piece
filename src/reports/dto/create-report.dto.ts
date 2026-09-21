import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportTargetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({
    description: "ID de l'utilisateur, du message ou de l'annonce",
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    enum: ReportReason,
    description: 'SCAM | HARASSMENT | INAPPROPRIATE_CONTENT | SPAM | OTHER',
  })
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
