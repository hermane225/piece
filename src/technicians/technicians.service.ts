import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TechnicianDto } from './dto/technician.dto';
import { FilterTechniciansDto } from './dto/filter-technicians.dto';

@Injectable()
export class TechniciansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get active technicians (public endpoint)
   * Returns only technicians with status = true
   * Supports pagination and optional filtering by city and specialty
   */
  async getActiveTechnicians(
    pagination: PaginationDto,
    filters?: FilterTechniciansDto,
  ): Promise<{
    data: TechnicianDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      status: true, // Only active technicians
    };

    if (filters?.city) {
      where.city = {
        contains: filters.city,
        mode: 'insensitive', // Case-insensitive search
      };
    }

    if (filters?.specialty) {
      where.specialty = filters.specialty;
    }

    const [technicians, total] = await Promise.all([
      this.prisma.technician.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          specialty: true,
          city: true,
          email: true,
          description: true,
          address: true,
          certifications: true,
          yearsOfExperience: true,
          hourlyRate: true,
          availability: true,
          createdAt: true,
        },
      }),
      this.prisma.technician.count({ where }),
    ]);

    return {
      data: technicians as TechnicianDto[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
