import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { CreateSpecialtyDto } from './dto/create-specialty.dto';
import type { SpecialtyResponseDto } from './dto/specialty-response.dto';
import type { UpdateServicePriceDto } from './dto/update-service-price.dto';
import type { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<SpecialtyResponseDto[]> {
    const specialties = await this.prisma.specialty.findMany({
      where: { tenantId, isActive: true },
      include: {
        services: {
          where: { isActive: true },
          include: { service: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return specialties.map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      services: s.services.map((sp) => ({
        id: sp.id,
        serviceId: sp.serviceId,
        serviceName: sp.service.name,
        priceUsd: sp.priceUsd.toString(),
        isActive: sp.isActive,
      })),
    }));
  }

  async findOne(tenantId: string, id: string): Promise<SpecialtyResponseDto> {
    const specialty = await this.prisma.specialty.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        services: {
          where: { isActive: true },
          include: { service: true },
        },
      },
    });
    if (!specialty) throw new NotFoundException(`Especialidad ${id} no encontrada`);

    return {
      id: specialty.id,
      name: specialty.name,
      isActive: specialty.isActive,
      services: specialty.services.map((sp) => ({
        id: sp.id,
        serviceId: sp.serviceId,
        serviceName: sp.service.name,
        priceUsd: sp.priceUsd.toString(),
        isActive: sp.isActive,
      })),
    };
  }

  async create(tenantId: string, dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    const existing = await this.prisma.specialty.findFirst({
      where: { tenantId, name: dto.name, isActive: true },
    });
    if (existing) throw new ConflictException(`Especialidad "${dto.name}" ya existe`);

    const specialty = await this.prisma.specialty.create({
      data: { tenantId, name: dto.name },
    });

    for (const svcDto of dto.services) {
      const service = await this.prisma.service.upsert({
        where: { name: svcDto.serviceName },
        update: {},
        create: { name: svcDto.serviceName },
      });

      await this.prisma.servicePrice.create({
        data: {
          specialtyId: specialty.id,
          serviceId: service.id,
          priceUsd: svcDto.priceUsd,
        },
      });
    }

    return this.findOne(tenantId, specialty.id);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    await this.assertExists(tenantId, id);
    await this.prisma.specialty.update({ where: { id }, data: { name: dto.name } });
    return this.findOne(tenantId, id);
  }

  async updateServicePrice(
    tenantId: string,
    specialtyId: string,
    servicePriceId: string,
    dto: UpdateServicePriceDto,
  ): Promise<SpecialtyResponseDto> {
    await this.assertExists(tenantId, specialtyId);
    const sp = await this.prisma.servicePrice.findFirst({
      where: { id: servicePriceId, specialtyId, isActive: true },
    });
    if (!sp) throw new NotFoundException(`Servicio ${servicePriceId} no encontrado`);

    await this.prisma.servicePrice.update({
      where: { id: servicePriceId },
      data: { priceUsd: dto.priceUsd },
    });
    return this.findOne(tenantId, specialtyId);
  }

  async deactivate(tenantId: string, id: string): Promise<SpecialtyResponseDto> {
    await this.assertExists(tenantId, id);
    await this.prisma.specialty.update({ where: { id }, data: { isActive: false } });
    return this.prisma.specialty.findUniqueOrThrow({ where: { id } }).then((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      services: [],
    }));
  }

  async deactivateService(
    tenantId: string,
    specialtyId: string,
    servicePriceId: string,
  ): Promise<SpecialtyResponseDto> {
    await this.assertExists(tenantId, specialtyId);
    await this.prisma.servicePrice.updateMany({
      where: { id: servicePriceId, specialtyId },
      data: { isActive: false },
    });
    return this.findOne(tenantId, specialtyId);
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const exists = await this.prisma.specialty.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!exists) throw new NotFoundException(`Especialidad ${id} no encontrada`);
  }
}
