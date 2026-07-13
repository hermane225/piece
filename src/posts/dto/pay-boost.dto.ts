import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PayBoostDto {
  @ApiPropertyOptional({
    example: 2000,
    description: 'Montant du boost (FCFA). Doit correspondre à un forfait GeniusPay',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({
    example: 'TRX-2026-000123',
    description: 'Référence de transaction (legacy, non requise avec GeniusPay)',
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Durée du boost en jours. Forfaits autorisés: 1, 3, 7, 20',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
}
