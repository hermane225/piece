import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus, ReportTargetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { normalizeEnumInput } from '../../common/utils/normalize-enum-input';

export class FilterReportsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportTargetType })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumInput(value))
  @IsEnum(ReportTargetType)
  targetType?: ReportTargetType;
}
