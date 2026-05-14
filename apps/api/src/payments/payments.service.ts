import {
  RECEIPT_EMAIL_QUEUE,
  RECEIPT_GENERATION_QUEUE,
  type ReceiptEmailJobData,
  type ReceiptGenerationJobData,
} from '@centro-medico/shared/queues';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';

import { PrismaService } from '../database/prisma.service';

import type { CreatePaymentAdjustmentDto } from './dto/create-payment-adjustment.dto';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type { PaymentResponseDto } from './dto/payment-response.dto';
import type {
  Currency,
  ItemType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

const IGTF_EXEMPT_METHODS = ['POS_USD_CARD'] as const;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(RECEIPT_GENERATION_QUEUE)
    private readonly receiptQueue: Queue<ReceiptGenerationJobData>,
    @InjectQueue(RECEIPT_EMAIL_QUEUE)
    private readonly receiptEmailQueue: Queue<ReceiptEmailJobData>,
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
        payment: {
          include: {
            item: {
              include: {
                consultation: { include: { services: true } },
              },
            },
            details: true,
            adjustments: true,
          },
        },
      },
    });

    if (existing?.status === 'COMPLETED' && existing.payment) {
      return this.buildResponse(existing.payment);
    }
    if (existing?.status === 'PROCESSING') {
      throw new ConflictException('Pago en proceso. Intente nuevamente en unos segundos.');
    }

    const servicePriceIds = dto.item.servicePriceIds ?? [];
    if (servicePriceIds.length === 0) {
      throw new BadRequestException('Se requieren servicios para una consulta médica');
    }

    const [servicePrices, patient, igtfConfig] = await Promise.all([
      this.prisma.servicePrice.findMany({
        where: { id: { in: servicePriceIds }, isActive: true },
        include: { service: true, specialty: true },
      }),
      this.prisma.patient.findFirst({
        where: { id: dto.patientId, tenantId, isActive: true },
      }),
      this.prisma.systemConfig.findFirst({
        where: { tenantId, key: 'igtf_rate' },
      }),
    ]);

    if (servicePrices.length !== servicePriceIds.length) {
      throw new BadRequestException('Uno o más servicios no son válidos o están inactivos');
    }
    if (!patient) throw new NotFoundException(`Paciente ${dto.patientId} no encontrado`);

    const igtfRate = parseFloat(igtfConfig?.value ?? '0') / 100;
    const totalServiceUsd = servicePrices.reduce(
      (sum, sp) => sum + parseFloat(sp.priceUsd.toString()),
      0,
    );

    const lines = dto.paymentLines.map((line) => {
      const isIgtfExempt = (IGTF_EXEMPT_METHODS as readonly string[]).includes(line.paymentMethod);
      const appliedIgtf = line.currency === 'USD' && !isIgtfExempt ? line.amount * igtfRate : 0;
      return { ...line, appliedIgtfAmount: appliedIgtf };
    });

    const totalPaidUsd = lines
      .filter((l) => l.currency === 'USD')
      .reduce((s, l) => s + l.amount, 0);
    const totalPaidBs = lines
      .filter((l) => l.currency === 'VES')
      .reduce((s, l) => s + l.amount, 0);
    const totalIgtfUsd = lines.reduce((s, l) => s + l.appliedIgtfAmount, 0);

    const doctorId = dto.item.doctorId;
    if (!doctorId) {
      throw new BadRequestException('Se requiere doctorId para pagos de consulta médica');
    }

    const doctorRecord = await this.prisma.doctor.findFirst({
      where: { id: doctorId, tenantId, isActive: true },
      include: { specialties: true },
    });

    if (!doctorRecord) throw new NotFoundException(`Doctor ${doctorId} no encontrado`);

    const doctorSpecialtyIds = new Set(doctorRecord.specialties.map((ds) => ds.specialtyId));
    const invalidService = servicePrices.find((sp) => !doctorSpecialtyIds.has(sp.specialtyId));
    if (invalidService) {
      throw new BadRequestException(
        `Servicio "${invalidService.service.name}" no corresponde a especialidades del doctor`,
      );
    }

    const splitPct = parseFloat(doctorRecord.splitPercentage.toString()) / 100;
    const doctorShareUsd = totalServiceUsd * splitPct;
    const centerShareUsd = totalServiceUsd - doctorShareUsd;

    await this.prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          doctorId: doctorRecord.id,
          status: 'PENDING',
        },
      });

      await tx.consultationService.createMany({
        data: servicePrices.map((sp) => ({
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

      await tx.consultationPayment.update({
        where: { id: consultationPayment.id },
        data: { status: 'PROCESSING' },
      });

      const payment = await tx.payment.create({
        data: {
          tenantId,
          idempotencyKey: dto.idempotencyKey,
          totalServiceUsd: round(totalServiceUsd),
          bcvExchangeRate: round(dto.bcvExchangeRate, 4),
          totalPaidUsd: round(totalPaidUsd),
          totalPaidBs: round(totalPaidBs),
          totalIgtfUsd: round(totalIgtfUsd),
          doctorShareUsd: round(doctorShareUsd),
          centerShareUsd: round(centerShareUsd),
          status: 'COMPLETED',
          details: {
            createMany: {
              data: lines.map((l) => ({
                paymentMethod: l.paymentMethod,
                currency: l.currency,
                amount: round(l.amount),
                referenceNumber: l.referenceNumber,
                appliedIgtfAmount: round(l.appliedIgtfAmount),
              })),
            },
          },
        },
        include: { details: true },
      });

      await tx.paymentItem.create({
        data: {
          paymentId: payment.id,
          itemType: 'CONSULTATION',
          description: dto.item.description || `Consulta - ${servicePrices.map((s) => s.service.name).join(', ')}`,
          quantity: 1,
          unitPriceUsd: round(totalServiceUsd),
          totalPriceUsd: round(totalServiceUsd),
          consultationId: consultation.id,
        },
      });

      await tx.consultation.update({
        where: { id: consultation.id },
        data: { status: 'PAID', paymentId: payment.id },
      });

      await tx.consultationPayment.update({
        where: { id: consultationPayment.id },
        data: { status: 'COMPLETED', paymentId: payment.id },
      });
    });

    const full = await this.prisma.payment.findFirstOrThrow({
      where: { idempotencyKey: dto.idempotencyKey, tenantId },
      include: {
        item: { include: { consultation: { include: { services: true } } } },
        details: true,
        adjustments: true,
      },
    });

    await this.receiptQueue.add('generate', {
      tenantId,
      paymentId: full.id,
      generatedById,
    });

    if (doctorRecord?.email) {
      await this.receiptEmailQueue.add('send', {
        tenantId,
        paymentId: full.id,
        recipientEmail: doctorRecord.email,
      });
    }

    return this.buildResponse(full);
  }

  private async createLabPayment(
    tenantId: string,
    _generatedById: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const labOrderId = dto.item.labOrderId;
    if (!labOrderId) {
      throw new BadRequestException('Se requiere labOrderId para pagos de laboratorio');
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

    if (!labOrder) throw new NotFoundException(`Orden de laboratorio ${labOrderId} no encontrada o ya pagada`);
    if (!patient) throw new NotFoundException(`Paciente ${dto.patientId} no encontrado`);

    const igtfRate = parseFloat(igtfConfig?.value ?? '0') / 100;
    const totalServiceUsd = parseFloat(labOrder.totalUsd.toString());

    const lines = dto.paymentLines.map((line) => {
      const isIgtfExempt = (IGTF_EXEMPT_METHODS as readonly string[]).includes(line.paymentMethod);
      const appliedIgtf = line.currency === 'USD' && !isIgtfExempt ? line.amount * igtfRate : 0;
      return { ...line, appliedIgtfAmount: appliedIgtf };
    });

    const totalPaidUsd = lines
      .filter((l) => l.currency === 'USD')
      .reduce((s, l) => s + l.amount, 0);
    const totalPaidBs = lines
      .filter((l) => l.currency === 'VES')
      .reduce((s, l) => s + l.amount, 0);
    const totalIgtfUsd = lines.reduce((s, l) => s + l.appliedIgtfAmount, 0);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          idempotencyKey: dto.idempotencyKey,
          totalServiceUsd: round(totalServiceUsd),
          bcvExchangeRate: round(dto.bcvExchangeRate, 4),
          totalPaidUsd: round(totalPaidUsd),
          totalPaidBs: round(totalPaidBs),
          totalIgtfUsd: round(totalIgtfUsd),
          doctorShareUsd: 0,
          centerShareUsd: round(totalServiceUsd),
          status: 'COMPLETED',
          details: {
            createMany: {
              data: lines.map((l) => ({
                paymentMethod: l.paymentMethod,
                currency: l.currency,
                amount: round(l.amount),
                referenceNumber: l.referenceNumber,
                appliedIgtfAmount: round(l.appliedIgtfAmount),
              })),
            },
          },
        },
        include: { details: true },
      });

      await tx.paymentItem.create({
        data: {
          paymentId: payment.id,
          itemType: 'LAB',
          description: dto.item.description || `Laboratorio - ${labOrder.tests.map((t) => t.testName).join(', ')}`,
          quantity: labOrder.tests.length,
          unitPriceUsd: round(totalServiceUsd / (labOrder.tests.length || 1)),
          totalPriceUsd: round(totalServiceUsd),
          labOrderId: labOrder.id,
        },
      });

      await tx.labOrder.update({
        where: { id: labOrder.id },
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

  async findOne(tenantId: string, paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        item: {
          include: {
            consultation: { include: { services: true } },
            labOrder: { include: { tests: true } },
          },
        },
        details: true,
        adjustments: true,
      },
    });
    if (!payment) throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    return this.buildResponse(payment);
  }

  async findAll(tenantId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, status: 'COMPLETED' },
      include: {
        item: {
          include: {
            consultation: { include: { services: true } },
            labOrder: { include: { tests: true } },
          },
        },
        details: true,
        adjustments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((p) => this.buildResponse(p));
  }

  async voidPayment(tenantId: string, paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        item: true,
        consultationPayment: true,
      },
    });
    if (!payment) throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    if (payment.status === 'VOIDED') throw new BadRequestException('Pago ya está anulado');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'VOIDED' } });

      if (payment.consultationPayment) {
        await tx.consultationPayment.update({
          where: { id: payment.consultationPayment.id },
          data: { status: 'VOIDED' },
        });
      }

      if (payment.item?.consultationId) {
        await tx.consultation.update({
          where: { id: payment.item.consultationId },
          data: { status: 'VOIDED' },
        });
      }

      if (payment.item?.labOrderId) {
        await tx.labOrder.update({
          where: { id: payment.item.labOrderId },
          data: { status: 'VOIDED' },
        });
      }
    });

    return this.findOne(tenantId, paymentId);
  }

  async addAdjustment(
    tenantId: string,
    paymentId: string,
    dto: CreatePaymentAdjustmentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: { id: true, status: true },
    });

    if (!payment) throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    if (payment.status === 'VOIDED') throw new BadRequestException('Pago anulado no admite ajustes');

    await this.prisma.paymentAdjustment.create({
      data: {
        paymentId,
        paymentDetailId: dto.paymentDetailId ?? null,
        description: dto.description,
        amountUsd: round(dto.amountUsd),
      },
    });

    return this.findOne(tenantId, paymentId);
  }

  private buildResponse(
    payment: {
      id: string;
      idempotencyKey: string | null;
      status: PaymentStatus;
      tenantId: string;
      totalServiceUsd: Prisma.Decimal;
      bcvExchangeRate: Prisma.Decimal;
      totalPaidUsd: Prisma.Decimal;
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
        } | null;
        labOrder?: {
          tests: Array<{
            labTestId: string;
            testName: string;
            priceUsd: Prisma.Decimal;
          }>;
        } | null;
      } | null;
    },
  ): PaymentResponseDto {
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
      tenantId: payment.tenantId,
      item: {
        id: item?.id ?? '',
        itemType: item?.itemType ?? 'CONSULTATION',
        description: item?.description ?? '',
        quantity: item?.quantity ?? 1,
        unitPriceUsd: item?.unitPriceUsd.toString() ?? '0',
        totalPriceUsd: item?.totalPriceUsd.toString() ?? '0',
        consultationId: item?.consultationId ?? undefined,
        labOrderId: item?.labOrderId ?? undefined,
        services,
        labTests,
      },
      totalServiceUsd: payment.totalServiceUsd.toString(),
      bcvExchangeRate: payment.bcvExchangeRate.toString(),
      totalPaidUsd: payment.totalPaidUsd.toString(),
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
}

function round(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
