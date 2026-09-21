import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

export class UpdateReportDto {
  @ApiProperty({
    enum: ReportStatus,
    description: 'PENDING (en attente) | RESOLVED (traité) | REJECTED (rejeté)',
  })
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ maxLength: 1000, description: 'Note interne admin' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
