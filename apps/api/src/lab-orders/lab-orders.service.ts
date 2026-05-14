import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { CreateLabOrderDto } from './dto/create-lab-order.dto';

@Injectable()
export class LabOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.labOrder.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, name: true, documentType: true, documentId: true } },
        tests: { include: { labTest: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, tenantId },
      include: {
        patient: { select: { id: true, name: true, documentType: true, documentId: true } },
        tests: { include: { labTest: { select: { id: true, name: true } } } },
      },
    });
    if (!order) throw new NotFoundException(`Orden de laboratorio ${id} no encontrada`);
    return order;
  }

  async create(tenantId: string, dto: CreateLabOrderDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
    });
    if (!patient) throw new NotFoundException(`Paciente ${dto.patientId} no encontrado`);

    const labTests = await this.prisma.labTestCatalog.findMany({
      where: { id: { in: dto.labTestIds }, tenantId, isActive: true },
    });
    if (labTests.length !== dto.labTestIds.length) {
      throw new BadRequestException('Uno o más tests de laboratorio no son válidos o están inactivos');
    }

    const totalUsd = labTests.reduce((sum, t) => sum + Number(t.priceUsd), 0);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.labOrder.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          totalUsd,
        },
      });

      await tx.labOrderTest.createMany({
        data: labTests.map((t) => ({
          labOrderId: order.id,
          labTestId: t.id,
          testName: t.name,
          priceUsd: t.priceUsd,
        })),
      });

      return tx.labOrder.findFirstOrThrow({
        where: { id: order.id },
        include: {
          patient: { select: { id: true, name: true, documentType: true, documentId: true } },
          tests: { include: { labTest: { select: { id: true, name: true } } } },
        },
      });
    });
  }
}
