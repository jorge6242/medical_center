import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { CreateLabTestCatalogDto, UpdateLabTestCatalogDto } from './dto/create-lab-test-catalog.dto';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.labTestCatalog.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const lab = await this.prisma.labTestCatalog.findFirst({
      where: { id, tenantId },
    });
    if (!lab) throw new NotFoundException(`Test de laboratorio ${id} no encontrado`);
    return lab;
  }

  async create(tenantId: string, dto: CreateLabTestCatalogDto) {
    const existing = await this.prisma.labTestCatalog.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) throw new BadRequestException(`Ya existe un test con el nombre "${dto.name}"`);

    return this.prisma.labTestCatalog.create({
      data: {
        tenantId,
        name: dto.name,
        priceUsd: dto.priceUsd,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLabTestCatalogDto) {
    await this.findOne(tenantId, id);

    if (dto.name) {
      const existing = await this.prisma.labTestCatalog.findFirst({
        where: { tenantId, name: dto.name, id: { not: id } },
      });
      if (existing) throw new BadRequestException(`Ya existe un test con el nombre "${dto.name}"`);
    }

    return this.prisma.labTestCatalog.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.priceUsd !== undefined && { priceUsd: dto.priceUsd }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.labTestCatalog.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
