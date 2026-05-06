import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TechniciansService } from './technicians.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterTechniciansDto } from './dto/filter-technicians.dto';
import { GetTechniciansResponseDto, TechnicianSpecialtyEnum } from './dto/technician.dto';

@ApiTags('Technicians')
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all active technicians',
    description:
      'Retrieve a paginated list of active technicians created by admins. This is a public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active technicians',
    type: GetTechniciansResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by city name (case-insensitive partial match)',
    example: 'Paris',
  })
  @ApiQuery({
    name: 'specialty',
    required: false,
    enum: TechnicianSpecialtyEnum,
    description: 'Filter by technician specialty',
    example: 'PLUMBER',
  })
  async getActiveTechnicians(
    @Query() pagination: PaginationDto,
    @Query() filters: FilterTechniciansDto,
  ): Promise<GetTechniciansResponseDto> {
    return this.techniciansService.getActiveTechnicians(pagination, filters);
  }
}
