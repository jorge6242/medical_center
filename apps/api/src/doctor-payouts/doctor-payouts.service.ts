import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { type CreateDoctorPayoutDto } from './dto/create-doctor-payout.dto';
import { type DoctorPayoutQueryDto } from './dto/doctor-payout-query.dto';
import { type AuditLogService } from '../audit-log/audit-log.service';
import { createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { type PrismaService } from '../database/prisma.service';

@Injectable()
export class DoctorPayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findPending(tenantId: string, doctorId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        splitPercentage: true,
        bankAccounts: { where: { isActive: true, isDefault: true }, take: 1 },
      },
    });
    if (!doctor)
      throw new NotFoundException(`Doctor ${doctorId} no encontrado`);

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        item: { itemType: 'CONSULTATION', consultation: { doctorId } },
        doctorPayoutItems: { none: { payout: { status: 'COMPLETED' } } },
      },
      select: {
        id: true,
        createdAt: true,
        totalServiceUsd: true,
        doctorShareUsd: true,
        item: {
          select: {
            description: true,
            consultation: {
              select: { date: true, patient: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalConsultationUsd = payments.reduce(
      (sum, payment) => sum.plus(payment.totalServiceUsd),
      new Prisma.Decimal(0),
    );
    const totalDoctorShareUsd = payments.reduce(
      (sum, payment) => sum.plus(payment.doctorShareUsd),
      new Prisma.Decimal(0),
    );
    const account = doctor.bankAccounts[0];

    return {
      doctor: {
        id: doctor.id,
        name: doctor.name,
        splitPercentage: doctor.splitPercentage.toString(),
        bankName: account?.bankName ?? null,
        accountNumber: account?.accountNumber ?? null,
        bankPhone: account?.phone ?? null,
      },
      payments: payments.map((payment) => ({
        id: payment.id,
        createdAt: payment.createdAt,
        consultationDate: payment.item?.consultation?.date ?? null,
        description: payment.item?.description ?? 'Consulta médica',
        patientName: payment.item?.consultation?.patient.name ?? 'Paciente',
        totalConsultationUsd: payment.totalServiceUsd.toString(),
        doctorShareUsd: payment.doctorShareUsd.toString(),
      })),
      totals: {
        totalConsultationUsd: totalConsultationUsd.toString(),
        totalDoctorShareUsd: totalDoctorShareUsd.toString(),
      },
    };
  }

  async findAll(tenantId: string, query: DoctorPayoutQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, payouts] = await this.prisma.$transaction([
      this.prisma.doctorPayout.count({ where }),
      this.prisma.doctorPayout.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
    ]);
    return createPaginatedResponse(
      payouts.map((payout) => this.toResponse(payout)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const payout = await this.prisma.doctorPayout.findFirst({
      where: { id, tenantId },
      include: {
        doctor: { select: { documentType: true, documentId: true } },
        items: {
          include: {
            payment: {
              select: {
                item: {
                  select: {
                    description: true,
                    consultation: {
                      select: {
                        date: true,
                        patient: {
                          select: {
                            name: true,
                            documentType: true,
                            documentId: true,
                          },
                        },
                        services: {
                          select: { serviceName: true, specialtyName: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!payout)
      throw new NotFoundException(`Pago de honorarios ${id} no encontrado`);

    return {
      ...this.toResponse({ ...payout, items: [] }),
      doctorDocument: `${payout.doctor.documentType}-${payout.doctor.documentId}`,
      items: payout.items.map((item) => {
        const consultation = item.payment.item?.consultation;
        return {
          paymentId: item.paymentId,
          consultationDate: consultation?.date ?? null,
          patientName: consultation?.patient.name ?? 'Paciente',
          patientDocument: consultation
            ? `${consultation.patient.documentType}-${consultation.patient.documentId}`
            : null,
          description: item.payment.item?.description ?? 'Consulta médica',
          services: consultation?.services ?? [],
        };
      }),
    };
  }

  async create(tenantId: string, userId: string, dto: CreateDoctorPayoutDto) {
    if (new Set(dto.paymentIds).size !== dto.paymentIds.length) {
      throw new BadRequestException(
        'No se puede incluir una consulta más de una vez',
      );
    }
    if (dto.paymentMethod === 'PAGO_MOVIL' && !dto.referenceNumber?.trim()) {
      throw new BadRequestException(
        'La referencia es obligatoria para Pago Móvil',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const pending = await this.findPendingForTransaction(
        tx,
        tenantId,
        dto.doctorId,
        dto.paymentIds,
      );
      if (pending.length !== dto.paymentIds.length) {
        throw new BadRequestException(
          'Una o más consultas ya fueron liquidadas o no pertenecen al doctor',
        );
      }
      const doctor = await tx.doctor.findFirst({
        where: { id: dto.doctorId, tenantId, isActive: true },
        include: {
          bankAccounts: { where: { isActive: true, isDefault: true }, take: 1 },
        },
      });
      if (!doctor)
        throw new NotFoundException(`Doctor ${dto.doctorId} no encontrado`);

      const amountUsd = pending.reduce(
        (sum, payment) => sum.plus(payment.doctorShareUsd),
        new Prisma.Decimal(0),
      );
      if (!dto.bcvExchangeRate)
        throw new BadRequestException(
          'La tasa BCV es obligatoria para registrar un pago de honorarios',
        );
      const isVes = dto.currency === 'VES';
      const equivalentBs = amountUsd
        .mul(dto.bcvExchangeRate)
        .toDecimalPlaces(2);
      const paidAmount = isVes ? equivalentBs : amountUsd;
      const account = doctor.bankAccounts[0];
      const payout = await tx.doctorPayout.create({
        data: {
          tenantId,
          doctorId: doctor.id,
          createdById: userId,
          paymentMethod: dto.paymentMethod,
          currency: dto.currency,
          amountUsd,
          paidAmount,
          bcvExchangeRate: dto.bcvExchangeRate,
          referenceNumber: dto.referenceNumber?.trim() || null,
          doctorName: doctor.name,
          bankName: dto.bankName?.trim() || account?.bankName || '',
          accountNumber:
            dto.accountNumber?.trim() || account?.accountNumber || null,
          bankPhone: dto.bankPhone?.trim() || account?.phone || null,
          items: {
            createMany: {
              data: pending.map((payment) => ({
                paymentId: payment.id,
                totalConsultationUsd: payment.totalServiceUsd,
                doctorShareUsd: payment.doctorShareUsd,
              })),
            },
          },
        },
        include: { items: true },
      });
      await this.auditLog.log(
        {
          tenantId,
          userId,
          action: 'CREATE',
          entity: 'DoctorPayout',
          entityId: payout.id,
          newValues: {
            doctorId: doctor.id,
            amountUsd: payout.amountUsd.toString(),
            paymentMethod: payout.paymentMethod,
          },
          changedFields: ['doctorId', 'amountUsd', 'paymentMethod'],
        },
        tx,
      );
      return this.toResponse(payout);
    });
  }

  async void(tenantId: string, userId: string, id: string, reason: string) {
    const payout = await this.prisma.doctorPayout.findFirst({
      where: { id, tenantId },
    });
    if (!payout)
      throw new NotFoundException(`Pago de honorarios ${id} no encontrado`);
    if (payout.status === 'VOIDED')
      throw new BadRequestException('El pago de honorarios ya está anulado');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.doctorPayout.update({
        where: { id: payout.id },
        data: {
          status: 'VOIDED',
          voidedById: userId,
          voidReason: reason,
          voidedAt: new Date(),
        },
        include: { items: true },
      });
      await this.auditLog.log(
        {
          tenantId,
          userId,
          action: 'VOID',
          entity: 'DoctorPayout',
          entityId: id,
          newValues: { status: result.status, voidReason: reason },
          changedFields: ['status', 'voidReason'],
        },
        tx,
      );
      return result;
    });
    return this.toResponse(updated);
  }

  private async findPendingForTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    doctorId: string,
    paymentIds: string[],
  ) {
    return tx.payment.findMany({
      where: {
        tenantId,
        id: { in: paymentIds },
        status: 'COMPLETED',
        item: { itemType: 'CONSULTATION', consultation: { doctorId } },
        doctorPayoutItems: { none: { payout: { status: 'COMPLETED' } } },
      },
      select: { id: true, totalServiceUsd: true, doctorShareUsd: true },
    });
  }

  private toResponse(payout: {
    id: string;
    doctorId: string;
    doctorName: string;
    status: string;
    paymentMethod: string;
    currency: string;
    amountUsd: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    bcvExchangeRate: Prisma.Decimal | null;
    referenceNumber: string | null;
    bankName: string;
    accountNumber: string | null;
    bankPhone: string | null;
    createdAt: Date;
    voidReason?: string | null;
    items: Array<{
      paymentId: string;
      totalConsultationUsd: Prisma.Decimal;
      doctorShareUsd: Prisma.Decimal;
    }>;
  }) {
    const equivalentBs =
      payout.bcvExchangeRate
        ?.mul(payout.amountUsd)
        .toDecimalPlaces(2)
        .toFixed(2) ?? null;
    return {
      id: payout.id,
      doctorId: payout.doctorId,
      doctorName: payout.doctorName,
      status: payout.status,
      paymentMethod: payout.paymentMethod,
      currency: payout.currency,
      amountUsd: payout.amountUsd.toFixed(2),
      paidAmount: payout.paidAmount.toFixed(2),
      bcvExchangeRate: payout.bcvExchangeRate?.toFixed(4) ?? null,
      equivalentBs,
      referenceNumber: payout.referenceNumber,
      bankName: payout.bankName,
      accountNumber: payout.accountNumber,
      bankPhone: payout.bankPhone,
      createdAt: payout.createdAt,
      voidReason: payout.voidReason ?? null,
      items: payout.items.map((item) => ({
        paymentId: item.paymentId,
        totalConsultationUsd: item.totalConsultationUsd.toFixed(2),
        doctorShareUsd: item.doctorShareUsd.toFixed(2),
      })),
    };
  }
}
