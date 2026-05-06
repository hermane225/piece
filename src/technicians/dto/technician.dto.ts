import { ApiProperty } from '@nestjs/swagger';

export enum TechnicianSpecialtyEnum {
  COMPUTER_REPAIR = 'COMPUTER_REPAIR',
  PLUMBER = 'PLUMBER',
  ELECTRICIAN = 'ELECTRICIAN',
  CARPENTER = 'CARPENTER',
  AC_TECHNICIAN = 'AC_TECHNICIAN',
  APPLIANCES_REPAIR = 'APPLIANCES_REPAIR',
  AUTO_REPAIR = 'AUTO_REPAIR',
  MOTO_REPAIR = 'MOTO_REPAIR',
  SOLAR_INSTALLATION = 'SOLAR_INSTALLATION',
  ELECTRICAL_EQUIPMENT = 'ELECTRICAL_EQUIPMENT',
  INDUSTRIAL_EQUIPMENT = 'INDUSTRIAL_EQUIPMENT',
  GAMING_CONSOLE_REPAIR = 'GAMING_CONSOLE_REPAIR',
  OTHER = 'OTHER',
}

export class TechnicianDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jean Dupont' })
  name: string;

  @ApiProperty({ example: '+33612345678' })
  phone: string;

  @ApiProperty({ enum: TechnicianSpecialtyEnum, example: 'PLUMBER' })
  specialty: TechnicianSpecialtyEnum;

  @ApiProperty({ example: 'Paris' })
  city: string;

  @ApiProperty({ example: 'jean@example.com', required: false })
  email?: string;

  @ApiProperty({
    example: 'Plombier expérimenté avec 10 ans de pratique',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: '123 rue de la Paix', required: false })
  address?: string;

  @ApiProperty({
    example: 'Certificat de plomberie',
    required: false,
  })
  certifications?: string;

  @ApiProperty({ example: 10, required: false })
  yearsOfExperience?: number;

  @ApiProperty({ example: 50, required: false })
  hourlyRate?: number;

  @ApiProperty({
    example: JSON.stringify({
      monday: '08:00-18:00',
      tuesday: '08:00-18:00',
    }),
    required: false,
  })
  availability?: string;

  @ApiProperty({ example: new Date() })
  createdAt: Date;
}

export class GetTechniciansResponseDto {
  @ApiProperty({ type: [TechnicianDto] })
  data: TechnicianDto[];

  @ApiProperty({
    example: {
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
