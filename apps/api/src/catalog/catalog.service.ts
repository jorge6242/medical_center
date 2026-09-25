import { Injectable } from '@nestjs/common';

import { type PrismaService } from '../database/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findServices(tenantId: string) {
    const doctorServices = await this.prisma.doctorService.findMany({
      where: {
        tenantId,
        doctor: { isActive: true },
        specialty: { isActive: true },
        service: { isActive: true },
      },
      include: { service: true, specialty: true },
      distinct: ['specialtyId', 'serviceId'],
      orderBy: [{ specialty: { name: 'asc' } }, { service: { name: 'asc' } }],
    });
    const grouped = new Map<
      string,
      {
        specialtyId: string;
        specialtyName: string;
        services: Array<{
          serviceId: string;
          serviceName: string;
          priceUsd: string;
        }>;
      }
    >();
    for (const item of doctorServices) {
      const group = grouped.get(item.specialtyId) ?? {
        specialtyId: item.specialtyId,
        specialtyName: item.specialty.name,
        services: [],
      };
      group.services.push({
        serviceId: item.serviceId,
        serviceName: item.service.name,
        priceUsd: item.priceUsd.toString(),
      });
      grouped.set(item.specialtyId, group);
    }
    return [...grouped.values()];
  }

  async findLaboratoryTests(tenantId: string) {
    const tests = await this.prisma.labTestCatalog.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });

    return tests.map((t) => ({
      labTestId: t.id,
      testName: t.name,
      priceUsd: t.priceUsd.toString(),
    }));
  }
}
