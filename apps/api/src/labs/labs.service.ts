import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

import type {
  CreateLabTestCatalogDto,
  UpdateLabTestCatalogDto,
} from './dto/create-lab-test-catalog.dto';
import type { LabTestCatalogResponseDto } from './dto/lab-test-catalog-response.dto';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<LabTestCatalogResponseDto[]> {
    const labs = await this.prisma.labTestCatalog.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, priceUsd: true, isActive: true },
    });
    return labs.map((lab) => this.toResponse(lab));
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<LabTestCatalogResponseDto> {
    const lab = await this.prisma.labTestCatalog.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, priceUsd: true, isActive: true },
    });
    if (!lab)
      throw new NotFoundException(`Test de laboratorio ${id} no encontrado`);
    return this.toResponse(lab);
  }

  async create(
    tenantId: string,
    dto: CreateLabTestCatalogDto,
  ): Promise<LabTestCatalogResponseDto> {
    const existing = await this.prisma.labTestCatalog.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing)
      throw new BadRequestException(
        `Ya existe un test con el nombre "${dto.name}"`,
      );

    const lab = await this.prisma.labTestCatalog.create({
      data: {
        tenantId,
        name: dto.name,
        priceUsd: dto.priceUsd,
        isActive: dto.isActive ?? true,
      },
      select: { id: true, name: true, priceUsd: true, isActive: true },
    });
    return this.toResponse(lab);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateLabTestCatalogDto,
  ): Promise<LabTestCatalogResponseDto> {
    await this.findOne(tenantId, id);

    if (dto.name) {
      const existing = await this.prisma.labTestCatalog.findFirst({
        where: { tenantId, name: dto.name, id: { not: id } },
      });
      if (existing)
        throw new BadRequestException(
          `Ya existe un test con el nombre "${dto.name}"`,
        );
    }

    await this.prisma.labTestCatalog.updateMany({
      where: { id, tenantId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.priceUsd !== undefined && { priceUsd: dto.priceUsd }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.findOne(tenantId, id);
  }

  async remove(
    tenantId: string,
    id: string,
  ): Promise<LabTestCatalogResponseDto> {
    await this.findOne(tenantId, id);
    await this.prisma.labTestCatalog.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
    return this.findOne(tenantId, id);
  }

  private toResponse(lab: {
    id: string;
    name: string;
    priceUsd: Prisma.Decimal;
    isActive: boolean;
  }): LabTestCatalogResponseDto {
    return {
      id: lab.id,
      name: lab.name,
      priceUsd: lab.priceUsd.toString(),
      isActive: lab.isActive,
    };
  }
}
