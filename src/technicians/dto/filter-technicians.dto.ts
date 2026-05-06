import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TechnicianSpecialtyEnum } from './technician.dto';

export class FilterTechniciansDto {
  @ApiPropertyOptional({
    description: 'Filter by city name',
    example: 'Paris',
  })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    enum: TechnicianSpecialtyEnum,
    description: 'Filter by specialty',
    example: 'PLUMBER',
  })
  @IsOptional()
  @IsEnum(TechnicianSpecialtyEnum)
  specialty?: TechnicianSpecialtyEnum;
}
