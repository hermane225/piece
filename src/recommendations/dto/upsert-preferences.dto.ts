import { ApiProperty } from '@nestjs/swagger';
import { Category } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PreferenceItemDto {
  @ApiProperty({ enum: Category })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({ minimum: 1, maximum: 10, required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number = 1;
}

export class UpsertPreferencesDto {
  @ApiProperty({ type: [PreferenceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto[];
}
