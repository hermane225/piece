import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PayBoostDto {
  @ApiProperty({ example: 2000, description: 'Montant payé pour le boost (FCFA)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'TRX-2026-000123', description: 'Référence de transaction paiement' })
  @IsNotEmpty({ message: 'La référence de paiement est requise' })
  @IsString()
  paymentReference: string;

  @ApiPropertyOptional({ example: 7, description: 'Durée du boost en jours (par défaut: 7)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
}
