import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LabOrderStatus, Prisma } from '@prisma/client';

import { createPaginatedResponse, type PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../database/prisma.service';

import type { CreateLabOrderDto } from './dto/create-lab-order.dto';
import type { LabOrderQueryDto } from './dto/lab-order-query.dto';
import type {
  LabOrderDetailResponseDto,
  LabOrderListResponseDto,
} from './dto/lab-order-response.dto';

@Injectable()
export class LabOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: LabOrderQueryDto,
  ): Promise<PaginatedResponseDto<LabOrderListResponseDto>> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LabOrderWhereInput = {
      tenantId,
      ...(status ? { status: status as LabOrderStatus } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: 'insensitive' as const } },
              { patient: { name: { contains: search, mode: 'insensitive' as const } } },
              { patient: { documentId: { contains: search, mode: 'insensitive' as const } } },
              { tests: { some: { testName: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.labOrder.count({ where }),
      this.prisma.labOrder.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          totalUsd: true,
          status: true,
          createdAt: true,
          patient: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(
      orders.map((order) => ({
        id: order.id,
        patientName: order.patient.name,
        totalUsd: order.totalUsd.toString(),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    );
  }

  async findOne(tenantId: string, id: string): Promise<LabOrderDetailResponseDto> {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, tenantId },
      include: {
        patient: { select: { id: true, name: true, documentType: true, documentId: true } },
        tests: { select: { labTestId: true, testName: true, priceUsd: true } },
      },
    });
    if (!order) throw new NotFoundException(`Orden de laboratorio ${id} no encontrada`);
    return this.toDetailResponse(order);
  }

  async create(tenantId: string, dto: CreateLabOrderDto): Promise<LabOrderDetailResponseDto> {
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

      const created = await tx.labOrder.findFirstOrThrow({
        where: { id: order.id },
        include: {
          patient: { select: { id: true, name: true, documentType: true, documentId: true } },
          tests: { select: { labTestId: true, testName: true, priceUsd: true } },
        },
      });

      return this.toDetailResponse(created);
    });
  }

  private toDetailResponse(order: {
    id: string;
    patient: { id: string; name: string; documentType: string; documentId: string };
    tests: Array<{ labTestId: string; testName: string; priceUsd: Prisma.Decimal }>;
    totalUsd: Prisma.Decimal;
    status: LabOrderStatus;
    createdAt: Date;
  }): LabOrderDetailResponseDto {
    return {
      id: order.id,
      patient: order.patient,
      tests: order.tests.map((test) => ({
        labTestId: test.labTestId,
        testName: test.testName,
        priceUsd: test.priceUsd.toString(),
      })),
      totalUsd: order.totalUsd.toString(),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
