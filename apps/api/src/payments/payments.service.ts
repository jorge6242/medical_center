import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  assertPaymentMatchesService,
  calculatePaymentTotals,
} from './payment-calculations';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../database/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';

import type { CreatePaymentAdjustmentDto } from './dto/create-payment-adjustment.dto';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type { PaymentQueryDto } from './dto/payment-query.dto';
import type { PaymentResponseDto } from './dto/payment-response.dto';
import type {
  Currency,
  ItemType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptsService: ReceiptsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(
    tenantId: string,
    generatedById: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const itemType = dto.item.itemType;

    if (itemType === 'CONSULTATION') {
      return this.createConsultationPayment(tenantId, generatedById, dto);
    }

    if (itemType === 'LAB') {
      return this.createLabPayment(tenantId, generatedById, dto);
    }

    throw new BadRequestException(`Tipo de pago no soportado: ${itemType}`);
  }

  private async createConsultationPayment(
    tenantId: string,
    generatedById: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const existing = await this.prisma.consultationPayment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: {
        consultation: { select: { tenantId: true } },
        payment: {
          include: {
            item: {
              include: {
                consultation: {
                  include: {
                    services: true,
                    doctor: { include: { primarySpecialty: true } },
                    patient: true,
                  },
                },
              },
            },
            details: true,
            adjustments: true,
          },
        },
      },
    });

    if (existing && existing.consultation.tenantId !== tenantId) {
      throw new ConflictException('Idempotency key already used');
    }

    if (existing?.status === 'COMPLETED' && existing.payment) {
      return this.buildResponse(existing.payment);
    }
    if (existing?.status === 'PROCESSING') {
      throw new ConflictException(
        'Pago en proceso. Intente nuevamente en unos segundos.',
      );
    }

    const igtfConfig = await this.prisma.systemConfig.findFirst({
      where: { tenantId, key: 'igtf_rate' },
    });
    const igtfRate = parseFloat(igtfConfig?.value ?? '0') / 100;

    // ── Branch A: pay an existing scheduled or attended consultation ───────
    if (dto.item.consultationId) {
      const existingConsultation = await this.prisma.consultation.findFirst({
        where: {
          id: dto.item.consultationId,
          tenantId,
          status: { in: ['SCHEDULED', 'PENDING'] },
        },
        include: {
          services: true,
          doctor: true,
          patient: true,
        },
      });

      if (!existingConsultation) {
        throw new NotFoundException(
          `Consulta ${dto.item.consultationId} no encontrada o no admite pago`,
        );
      }

      const totalServiceUsd = existingConsultation.services.reduce(
        (sum, s) => sum + parseFloat(s.priceUsd.toString()),
        0,
      );

      const totals = calculatePaymentTotals(
        dto.paymentLines,
        dto.bcvExchangeRate,
        igtfRate,
      );
      assertPaymentMatchesService(
        totals.totalPaidUsdEquivalent,
        new Prisma.Decimal(totalServiceUsd),
        totals.totalIgtfUsd,
      );

      const splitPct =
        parseFloat(existingConsultation.doctor.splitPercentage.toString()) /
        100;
      const doctorShareUsd = totalServiceUsd * splitPct;
      const centerShareUsd = totalServiceUsd - doctorShareUsd;

      await this.prisma.$transaction(async (tx) => {
        const consultationPayment = await tx.consultationPayment.create({
          data: {
            idempotencyKey: dto.idempotencyKey,
            status: 'INITIATED',
            consultationId: existingConsultation.id,
          },
        });

        await tx.consultationPayment.updateMany({
          where: { id: consultationPayment.id, consultation: { tenantId } },
          data: { status: 'PROCESSING' },
        });

        const payment = await tx.payment.create({
          data: {
            tenantId,
            idempotencyKey: dto.idempotencyKey,
            totalServiceUsd: round(totalServiceUsd),
            bcvExchangeRate: round(dto.bcvExchangeRate, 4),
            totalPaidUsd: totals.totalPaidUsd,
            totalPaidUsdEquivalent:
              totals.totalPaidUsdEquivalent.toDecimalPlaces(2),
            totalPaidBs: totals.totalPaidBs,
            totalIgtfUsd: totals.totalIgtfUsd.toDecimalPlaces(2),
            doctorShareUsd: round(doctorShareUsd),
            centerShareUsd: round(centerShareUsd),
            status: 'COMPLETED',
            details: {
              createMany: {
                data: totals.lines.map((l) => ({
                  paymentMethod: l.paymentMethod,
                  currency: l.currency,
                  amount: round(l.amount),
                  referenceNumber: l.referenceNumber,
                  appliedIgtfAmount: l.appliedIgtfAmount.toDecimalPlaces(2),
                })),
              },
            },
          },
          include: { details: true },
        });

        await this.auditLog?.log(
          {
            tenantId,
            userId: generatedById,
            action: 'COMPLETE',
            entity: 'Payment',
            entityId: payment.id,
            newValues: {
              status: payment.status,
              totalServiceUsd: payment.totalServiceUsd,
            },
            changedFields: ['status', 'totalServiceUsd'],
          },
          tx,
        );

        await tx.paymentItem.create({
          data: {
            paymentId: payment.id,
            itemType: 'CONSULTATION',
            description:
              dto.item.description ||
              `Consulta - ${existingConsultation.services.map((s) => s.serviceName).join(', ')}`,
            quantity: 1,
            unitPriceUsd: round(totalServiceUsd),
            totalPriceUsd: round(totalServiceUsd),
            consultationId: existingConsultation.id,
          },
        });

        await tx.consultation.updateMany({
          where: { id: existingConsultation.id, tenantId },
          data: { status: 'PAID', paymentId: payment.id },
        });

        await tx.consultationPayment.updateMany({
          where: { id: consultationPayment.id, consultation: { tenantId } },
          data: { status: 'COMPLETED', paymentId: payment.id },
        });
      });

      const full = await this.prisma.payment.findFirstOrThrow({
        where: { idempotencyKey: dto.idempotencyKey, tenantId },
        include: {
          item: {
            include: {
              consultation: {
                include: {
                  services: true,
                  doctor: { include: { primarySpecialty: true } },
                  patient: true,
                },
              },
            },
          },
          details: true,
          adjustments: true,
        },
      });

      await this.processReceiptSideEffects(tenantId, full.id, generatedById);

      return this.buildResponse(full);
    }

    // ── Branch B: create a new consultation on the fly ──────────────────────
    const doctorServiceIds = dto.item.doctorServiceIds ?? [];
    if (doctorServiceIds.length === 0) {
      throw new BadRequestException(
        'Se requieren servicios para una consulta médica',
      );
    }

    const doctorId = dto.item.doctorId;
    if (!doctorId) {
      throw new BadRequestException(
        'Se requiere doctorId para pagos de consulta médica',
      );
    }

    const [doctorServices, patient] = await Promise.all([
      this.prisma.doctorService.findMany({
        where: {
          id: { in: doctorServiceIds },
          tenantId,
          doctorId: dto.item.doctorId,
        },
        include: { service: true, specialty: true },
      }),
      this.prisma.patient.findFirst({
        where: { id: dto.patientId, tenantId, isActive: true },
      }),
    ]);

    if (doctorServices.length !== doctorServiceIds.length) {
      throw new BadRequestException(
        'Uno o más servicios no son válidos o están inactivos',
      );
    }
    if (!patient)
      throw new NotFoundException(`Paciente ${dto.patientId} no encontrado`);

    const totalServiceUsd = doctorServices.reduce(
      (sum, sp) => sum + parseFloat(sp.priceUsd.toString()),
      0,
    );

    const totals = calculatePaymentTotals(
      dto.paymentLines,
      dto.bcvExchangeRate,
      igtfRate,
    );
    assertPaymentMatchesService(
      totals.totalPaidUsdEquivalent,
      new Prisma.Decimal(totalServiceUsd),
      totals.totalIgtfUsd,
    );

    const doctorRecord = await this.prisma.doctor.findFirst({
      where: { id: doctorId, tenantId, isActive: true },
    });

    if (!doctorRecord)
      throw new NotFoundException(`Doctor ${doctorId} no encontrado`);

    const splitPct = parseFloat(doctorRecord.splitPercentage.toString()) / 100;
    const doctorShareUsd = totalServiceUsd * splitPct;
    const centerShareUsd = totalServiceUsd - doctorShareUsd;

    const consultationStartsAt = dto.consultationDate ?? new Date();
    const consultationEndsAt = new Date(
      consultationStartsAt.getTime() + 60 * 60_000,
    );

    await this.prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          doctorId: doctorRecord.id,
          date: consultationStartsAt,
          endsAt: consultationEndsAt,
          status: 'PENDING',
        },
      });
      await this.auditLog?.log(
        {
          tenantId,
          userId: generatedById,
          action: 'CREATE',
          entity: 'Consultation',
          entityId: consultation.id,
          newValues: {
            status: consultation.status,
            patientId: consultation.patientId,
            doctorId: consultation.doctorId,
          },
          changedFields: ['status', 'patientId', 'doctorId'],
        },
        tx,
      );

      await tx.consultationService.createMany({
        data: doctorServices.map((sp) => ({
          consultationId: consultation.id,
          serviceId: sp.serviceId,
          specialtyId: sp.specialtyId,
          serviceName: sp.service.name,
          specialtyName: sp.specialty.name,
          priceUsd: sp.priceUsd,
        })),
      });

      const consultationPayment = await tx.consultationPayment.create({
        data: {
          idempotencyKey: dto.idempotencyKey,
          status: 'INITIATED',
          consultationId: consultation.id,
        },
      });

      await tx.consultationPayment.updateMany({
        where: { id: consultationPayment.id, consultation: { tenantId } },
        data: { status: 'PROCESSING' },
      });

      const payment = await tx.payment.create({
        data: {
          tenantId,
          idempotencyKey: dto.idempotencyKey,
          totalServiceUsd: round(totalServiceUsd),
          bcvExchangeRate: round(dto.bcvExchangeRate, 4),
          totalPaidUsd: totals.totalPaidUsd,
          totalPaidUsdEquivalent:
            totals.totalPaidUsdEquivalent.toDecimalPlaces(2),
          totalPaidBs: totals.totalPaidBs,
          totalIgtfUsd: totals.totalIgtfUsd.toDecimalPlaces(2),
          doctorShareUsd: round(doctorShareUsd),
          centerShareUsd: round(centerShareUsd),
          status: 'COMPLETED',
          details: {
            createMany: {
              data: totals.lines.map((l) => ({
                paymentMethod: l.paymentMethod,
                currency: l.currency,
                amount: round(l.amount),
                referenceNumber: l.referenceNumber,
                appliedIgtfAmount: l.appliedIgtfAmount.toDecimalPlaces(2),
              })),
            },
          },
        },
        include: { details: true },
      });
      await this.auditLog?.log(
        {
          tenantId,
          userId: generatedById,
          action: 'COMPLETE',
          entity: 'Payment',
          entityId: payment.id,
          newValues: {
            status: payment.status,
            totalServiceUsd: payment.totalServiceUsd,
          },
          changedFields: ['status', 'totalServiceUsd'],
        },
        tx,
      );

      await tx.paymentItem.create({
        data: {
          paymentId: payment.id,
          itemType: 'CONSULTATION',
          description:
            dto.item.description ||
            `Consulta - ${doctorServices.map((s) => s.service.name).join(', ')}`,
          quantity: 1,
          unitPriceUsd: round(totalServiceUsd),
          totalPriceUsd: round(totalServiceUsd),
          consultationId: consultation.id,
        },
      });

      await tx.consultation.updateMany({
        where: { id: consultation.id, tenantId },
        data: { status: 'PAID', paymentId: payment.id },
      });

      await tx.consultationPayment.updateMany({
        where: { id: consultationPayment.id, consultation: { tenantId } },
        data: { status: 'COMPLETED', paymentId: payment.id },
      });
    });

    const full = await this.prisma.payment.findFirstOrThrow({
      where: { idempotencyKey: dto.idempotencyKey, tenantId },
      include: {
        item: {
          include: {
            consultation: {
              include: {
                services: true,
                doctor: { include: { primarySpecialty: true } },
                patient: true,
              },
            },
          },
        },
        details: true,
        adjustments: true,
      },
    });

    await this.processReceiptSideEffects(tenantId, full.id, generatedById);

    return this.buildResponse(full);
  }

  private async createLabPayment(
    tenantId: string,
    generatedById: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const labOrderId = dto.item.labOrderId;
    if (!labOrderId) {
      throw new BadRequestException(
        'Se requiere labOrderId para pagos de laboratorio',
      );
    }

    const existing = await this.prisma.payment.findFirst({
      where: { idempotencyKey: dto.idempotencyKey, tenantId },
      include: {
        item: { include: { labOrder: { include: { tests: true } } } },
        details: true,
        adjustments: true,
      },
    });

    if (existing?.status === 'COMPLETED') {
      return this.buildResponse(existing);
    }

    const [labOrder, patient, igtfConfig] = await Promise.all([
      this.prisma.labOrder.findFirst({
        where: { id: labOrderId, tenantId, status: 'PENDING' },
        include: { tests: { include: { labTest: true } } },
      }),
      this.prisma.patient.findFirst({
        where: { id: dto.patientId, tenantId, isActive: true },
      }),
      this.prisma.systemConfig.findFirst({
        where: { tenantId, key: 'igtf_rate' },
      }),
    ]);

    if (!labOrder)
      throw new NotFoundException(
        `Orden de laboratorio ${labOrderId} no encontrada o ya pagada`,
      );
    if (!patient)
      throw new NotFoundException(`Paciente ${dto.patientId} no encontrado`);

    const igtfRate = parseFloat(igtfConfig?.value ?? '0') / 100;
    const totalServiceUsd = parseFloat(labOrder.totalUsd.toString());

    const totals = calculatePaymentTotals(
      dto.paymentLines,
      dto.bcvExchangeRate,
      igtfRate,
    );
    assertPaymentMatchesService(
      totals.totalPaidUsdEquivalent,
      new Prisma.Decimal(totalServiceUsd),
      totals.totalIgtfUsd,
    );

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          idempotencyKey: dto.idempotencyKey,
          totalServiceUsd: round(totalServiceUsd),
          bcvExchangeRate: round(dto.bcvExchangeRate, 4),
          totalPaidUsd: totals.totalPaidUsd,
          totalPaidUsdEquivalent:
            totals.totalPaidUsdEquivalent.toDecimalPlaces(2),
          totalPaidBs: totals.totalPaidBs,
          totalIgtfUsd: totals.totalIgtfUsd.toDecimalPlaces(2),
          doctorShareUsd: 0,
          centerShareUsd: round(totalServiceUsd),
          status: 'COMPLETED',
          details: {
            createMany: {
              data: totals.lines.map((l) => ({
                paymentMethod: l.paymentMethod,
                currency: l.currency,
                amount: round(l.amount),
                referenceNumber: l.referenceNumber,
                appliedIgtfAmount: l.appliedIgtfAmount.toDecimalPlaces(2),
              })),
            },
          },
        },
        include: { details: true },
      });
      await this.auditLog?.log(
        {
          tenantId,
          userId: generatedById,
          action: 'COMPLETE',
          entity: 'Payment',
          entityId: payment.id,
          newValues: {
            status: payment.status,
            totalServiceUsd: payment.totalServiceUsd,
          },
          changedFields: ['status', 'totalServiceUsd'],
        },
        tx,
      );

      await tx.paymentItem.create({
        data: {
          paymentId: payment.id,
          itemType: 'LAB',
          description:
            dto.item.description ||
            `Laboratorio - ${labOrder.tests.map((t) => t.testName).join(', ')}`,
          quantity: labOrder.tests.length,
          unitPriceUsd: round(totalServiceUsd / (labOrder.tests.length || 1)),
          totalPriceUsd: round(totalServiceUsd),
          labOrderId: labOrder.id,
        },
      });

      await tx.labOrder.updateMany({
        where: { id: labOrder.id, tenantId },
        data: { status: 'PAID' },
      });
    });

    const full = await this.prisma.payment.findFirstOrThrow({
      where: { idempotencyKey: dto.idempotencyKey, tenantId },
      include: {
        item: { include: { labOrder: { include: { tests: true } } } },
        details: true,
        adjustments: true,
      },
    });

    return this.buildResponse(full);
  }

  async findOne(
    tenantId: string,
    paymentId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        item: {
          include: {
            consultation: {
              include: {
                services: true,
                doctor: { include: { primarySpecialty: true } },
                patient: true,
              },
            },
            labOrder: { include: { tests: true } },
          },
        },
        details: true,
        adjustments: true,
      },
    });
    if (!payment)
      throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    return this.buildResponse(payment);
  }

  async findAll(
    tenantId: string,
    query: PaymentQueryDto,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      tenantId,
      ...(status ? { status: status as PaymentStatus } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: 'insensitive' as const } },
              {
                item: {
                  description: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                item: {
                  consultation: {
                    patient: {
                      name: { contains: search, mode: 'insensitive' as const },
                    },
                  },
                },
              },
              {
                item: {
                  consultation: {
                    patient: {
                      documentId: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, payments] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          item: {
            include: {
              consultation: {
                include: {
                  services: true,
                  doctor: { include: { primarySpecialty: true } },
                  patient: true,
                },
              },
              labOrder: { include: { tests: true } },
            },
          },
          details: true,
          adjustments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(
      payments.map((p) => this.buildResponse(p)),
      total,
      page,
      limit,
    );
  }

  async voidPayment(
    tenantId: string,
    userId: string,
    paymentId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        item: true,
        consultationPayment: true,
      },
    });
    if (!payment)
      throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    if (payment.status === 'VOIDED')
      throw new BadRequestException('Pago ya está anulado');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: paymentId, tenantId },
        data: { status: 'VOIDED' },
      });
      const updated = await tx.payment.findFirstOrThrow({
        where: { id: paymentId, tenantId },
      });
      await this.auditLog?.log(
        {
          tenantId,
          userId,
          action: 'VOID',
          entity: 'Payment',
          entityId: updated.id,
          newValues: { status: updated.status },
          changedFields: ['status'],
        },
        tx,
      );

      if (payment.consultationPayment) {
        await tx.consultationPayment.updateMany({
          where: {
            id: payment.consultationPayment.id,
            consultation: { tenantId },
          },
          data: { status: 'VOIDED' },
        });
      }

      if (payment.item?.consultationId) {
        await tx.consultation.updateMany({
          where: { id: payment.item.consultationId, tenantId },
          data: { status: 'VOIDED' },
        });
        const consultation = await tx.consultation.findFirstOrThrow({
          where: { id: payment.item.consultationId, tenantId },
        });
        await this.auditLog?.log(
          {
            tenantId,
            userId,
            action: 'VOID',
            entity: 'Consultation',
            entityId: consultation.id,
            newValues: { status: consultation.status },
            changedFields: ['status'],
          },
          tx,
        );
      }

      if (payment.item?.labOrderId) {
        await tx.labOrder.updateMany({
          where: { id: payment.item.labOrderId, tenantId },
          data: { status: 'VOIDED' },
        });
      }
    });

    return this.findOne(tenantId, paymentId);
  }

  async addAdjustment(
    tenantId: string,
    userId: string,
    paymentId: string,
    dto: CreatePaymentAdjustmentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: { id: true, status: true },
    });

    if (!payment)
      throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    if (payment.status === 'VOIDED')
      throw new BadRequestException('Pago anulado no admite ajustes');

    await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.paymentAdjustment.create({
        data: {
          paymentId,
          paymentDetailId: dto.paymentDetailId ?? null,
          description: dto.description,
          amountUsd: round(dto.amountUsd),
        },
      });
      await this.auditLog?.log(
        {
          tenantId,
          userId,
          action: 'ADJUSTMENT',
          entity: 'Payment',
          entityId: payment.id,
          newValues: {
            adjustmentId: adjustment.id,
            amountUsd: adjustment.amountUsd,
          },
          changedFields: ['adjustments'],
        },
        tx,
      );
    });

    return this.findOne(tenantId, paymentId);
  }

  private buildResponse(payment: {
    id: string;
    idempotencyKey: string | null;
    status: PaymentStatus;
    tenantId: string;
    totalServiceUsd: Prisma.Decimal;
    bcvExchangeRate: Prisma.Decimal;
    totalPaidUsd: Prisma.Decimal;
    totalPaidUsdEquivalent: Prisma.Decimal;
    totalPaidBs: Prisma.Decimal;
    totalIgtfUsd: Prisma.Decimal;
    doctorShareUsd: Prisma.Decimal;
    centerShareUsd: Prisma.Decimal;
    createdAt: Date;
    details: Array<{
      id: string;
      paymentMethod: PaymentMethod;
      currency: Currency;
      amount: Prisma.Decimal;
      referenceNumber: string | null;
      appliedIgtfAmount: Prisma.Decimal;
    }>;
    adjustments: Array<{
      id: string;
      description: string;
      amountUsd: Prisma.Decimal;
      paymentDetailId: string | null;
      createdAt: Date;
    }>;
    item?: {
      id: string;
      itemType: ItemType;
      description: string;
      quantity: number;
      unitPriceUsd: Prisma.Decimal;
      totalPriceUsd: Prisma.Decimal;
      consultationId?: string | null;
      labOrderId?: string | null;
      consultation?: {
        patientId: string;
        doctorId: string;
        services: Array<{
          serviceId: string;
          serviceName: string;
          specialtyName: string;
          priceUsd: Prisma.Decimal;
        }>;
        doctor: {
          name: string;
          lastName: string;
          primarySpecialty: { name: string };
        };
        patient: {
          name: string;
          documentId: string;
        };
      } | null;
      labOrder?: {
        tests: Array<{
          labTestId: string;
          testName: string;
          priceUsd: Prisma.Decimal;
        }>;
      } | null;
    } | null;
  }): PaymentResponseDto {
    const item = payment.item;

    let services: PaymentResponseDto['item']['services'] = undefined;
    let labTests: PaymentResponseDto['item']['labTests'] = undefined;

    if (item?.itemType === 'CONSULTATION' && item.consultation?.services) {
      services = item.consultation.services.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        specialtyName: s.specialtyName,
        priceUsd: s.priceUsd.toString(),
      }));
    }

    if (item?.itemType === 'LAB' && item.labOrder?.tests) {
      labTests = item.labOrder.tests.map((t) => ({
        labTestId: t.labTestId,
        testName: t.testName,
        priceUsd: t.priceUsd.toString(),
      }));
    }

    return {
      id: payment.id,
      idempotencyKey: payment.idempotencyKey ?? '',
      status: payment.status,
      item: {
        id: item?.id ?? '',
        itemType: item?.itemType ?? 'CONSULTATION',
        description: item?.description ?? '',
        quantity: item?.quantity ?? 1,
        unitPriceUsd: item?.unitPriceUsd.toString() ?? '0',
        totalPriceUsd: item?.totalPriceUsd.toString() ?? '0',
        patientId: item?.consultation?.patientId ?? undefined,
        consultationId: item?.consultationId ?? undefined,
        labOrderId: item?.labOrderId ?? undefined,
        patientName: item?.consultation?.patient.name ?? undefined,
        patientDocumentId: item?.consultation?.patient.documentId ?? undefined,
        doctorName: item?.consultation?.doctor
          ? `${item.consultation.doctor.name} ${item.consultation.doctor.lastName}`.trim()
          : undefined,
        doctorSpecialtyName:
          item?.consultation?.doctor.primarySpecialty.name ?? undefined,
        services,
        labTests,
      },
      totalServiceUsd: payment.totalServiceUsd.toString(),
      bcvExchangeRate: payment.bcvExchangeRate.toString(),
      totalPaidUsd: payment.totalPaidUsd.toString(),
      totalPaidUsdEquivalent: payment.totalPaidUsdEquivalent.toString(),
      totalPaidBs: payment.totalPaidBs.toString(),
      totalIgtfUsd: payment.totalIgtfUsd.toString(),
      doctorShareUsd: payment.doctorShareUsd.toString(),
      centerShareUsd: payment.centerShareUsd.toString(),
      details: payment.details.map((d) => ({
        id: d.id,
        paymentMethod: d.paymentMethod,
        currency: d.currency,
        amount: d.amount.toString(),
        referenceNumber: d.referenceNumber,
        appliedIgtfAmount: d.appliedIgtfAmount.toString(),
      })),
      adjustments: payment.adjustments.map((a) => ({
        id: a.id,
        description: a.description,
        amountUsd: a.amountUsd.toString(),
        paymentDetailId: a.paymentDetailId,
        createdAt: a.createdAt,
      })),
      createdAt: payment.createdAt,
    };
  }

  async processReceiptSideEffects(
    tenantId: string,
    paymentId: string,
    generatedById: string,
  ): Promise<{
    receiptId?: string;
    emailDeliveryStatus: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let receiptId: string | undefined;

    try {
      const receipt = await this.receiptsService.createForPayment(
        tenantId,
        paymentId,
        generatedById,
      );
      receiptId = receipt.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Receipt generation failed for payment ${paymentId}: ${message}`,
      );
      warnings.push(`Receipt generation failed: ${message}`);
    }

    return {
      receiptId,
      emailDeliveryStatus: receiptId ? 'skipped' : 'failed',
      warnings,
    };
  }
}

function round(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
