import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findServices() {
    const specialties = await this.prisma.specialty.findMany({
      where: { isActive: true },
      include: {
        services: {
          where: { isActive: true },
          include: { service: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return specialties.map((s) => ({
      specialtyId: s.id,
      specialtyName: s.name,
      services: s.services.map((sp) => ({
        serviceId: sp.serviceId,
        serviceName: sp.service.name,
        priceUsd: sp.priceUsd.toString(),
      })),
    }));
  }

  async findLaboratoryTests() {
    const tests = await this.prisma.labTestCatalog.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return tests.map((t) => ({
      labTestId: t.id,
      testName: t.name,
      priceUsd: t.priceUsd.toString(),
    }));
  }
}
