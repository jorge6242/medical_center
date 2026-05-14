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
  ConsultationPaymentStatus,
  Currency,
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
    const existing = await this.prisma.consultationPayment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: {
        payment: {
          include: {
            details: true,
            adjustments: true,
            consultation: { include: { services: true } },
          },
        },
      },
    });

    if (existing?.status === 'COMPLETED' && existing.payment) {
      return this.buildResponse(existing, existing.payment);
    }
    if (existing?.status === 'PROCESSING') {
      throw new ConflictException('Pago en proceso. Intente nuevamente en unos segundos.');
    }

    const [servicePrices, doctorRecord, igtfConfig] = await Promise.all([
      this.prisma.servicePrice.findMany({
        where: { id: { in: dto.servicePriceIds }, isActive: true },
        include: { service: true, specialty: true },
      }),
      this.prisma.doctor.findFirst({
        where: { id: dto.doctorId, tenantId, isActive: true },
        include: { specialties: true },
      }),
      this.prisma.systemConfig.findFirst({
        where: { tenantId, key: 'igtf_rate' },
      }),
    ]);

    if (servicePrices.length !== dto.servicePriceIds.length) {
      throw new BadRequestException('Uno o más servicios no son válidos o están inactivos');
    }
    if (!doctorRecord) throw new NotFoundException(`Doctor ${dto.doctorId} no encontrado`);

    const doctorSpecialtyIds = new Set(doctorRecord.specialties.map((ds) => ds.specialtyId));
    const invalidService = servicePrices.find((sp) => !doctorSpecialtyIds.has(sp.specialtyId));
    if (invalidService) {
      throw new BadRequestException(
        `Servicio "${invalidService.service.name}" no corresponde a especialidades del doctor`,
      );
    }

    const igtfRate = parseFloat(igtfConfig?.value ?? '0') / 100;
    const totalServiceUsd = servicePrices.reduce(
      (sum, sp) => sum + parseFloat(sp.priceUsd.toString()),
      0,
    );
    const splitPct = parseFloat(doctorRecord.splitPercentage.toString()) / 100;
    const doctorShareUsd = totalServiceUsd * splitPct;
    const centerShareUsd = totalServiceUsd - doctorShareUsd;

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

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
    });
    if (!patient) throw new NotFoundException(`Paciente ${dto.patientId} no encontrado`);

    await this.prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
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

      await tx.consultation.update({
        where: { id: consultation.id },
        data: { status: 'PAID', paymentId: payment.id },
      });

      await tx.consultationPayment.update({
        where: { id: consultationPayment.id },
        data: { status: 'COMPLETED', paymentId: payment.id },
      });

      // transaction complete — data fetched via findUniqueOrThrow below
    });

    const full = await this.prisma.consultationPayment.findUniqueOrThrow({
      where: { idempotencyKey: dto.idempotencyKey },
        include: {
          payment: {
            include: {
              details: true,
              adjustments: true,
              consultation: { include: { services: true } },
            },
          },
        },
    });

    if (!full.payment) throw new NotFoundException('Pago no encontrado tras creación');
    await this.receiptQueue.add('generate', {
      tenantId,
      paymentId: full.payment.id,
      generatedById,
    });

    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, tenantId },
      select: { email: true },
    });

    if (doctor?.email) {
      await this.receiptEmailQueue.add('send', {
        tenantId,
        paymentId: full.payment.id,
        recipientEmail: doctor.email,
      });
    }

    return this.buildResponse(full, full.payment);
  }

  async findOne(tenantId: string, paymentId: string): Promise<PaymentResponseDto> {
    const cp = await this.prisma.consultationPayment.findFirst({
      where: { payment: { id: paymentId }, consultation: { tenantId } },
      include: {
        payment: {
          include: {
            details: true,
            adjustments: true,
            consultation: { include: { services: true } },
          },
        },
      },
    });
    if (!cp?.payment) throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    return this.buildResponse(cp, cp.payment);
  }

  async findAll(tenantId: string): Promise<PaymentResponseDto[]> {
    const cps = await this.prisma.consultationPayment.findMany({
      where: { consultation: { tenantId }, status: 'COMPLETED' },
      include: {
        payment: {
          include: {
            details: true,
            adjustments: true,
            consultation: { include: { services: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return cps
      .filter((cp): cp is typeof cp & { payment: NonNullable<typeof cp.payment> } => cp.payment !== null)
      .map((cp) => this.buildResponse(cp, cp.payment));
  }

  async voidPayment(tenantId: string, paymentId: string): Promise<PaymentResponseDto> {
    const cp = await this.prisma.consultationPayment.findFirst({
      where: { payment: { id: paymentId }, consultation: { tenantId } },
      include: { payment: true, consultation: true },
    });
    if (!cp?.payment) throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    if (cp.payment.status === 'VOIDED') throw new BadRequestException('Pago ya está anulado');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'VOIDED' } });
      await tx.consultationPayment.update({ where: { id: cp.id }, data: { status: 'VOIDED' } });
      await tx.consultation.update({
        where: { id: cp.consultationId },
        data: { status: 'VOIDED' },
      });
    });

    return this.findOne(tenantId, paymentId);
  }

  async addAdjustment(
    tenantId: string,
    paymentId: string,
    dto: CreatePaymentAdjustmentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, consultation: { tenantId } },
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
    cp: {
      id: string;
      idempotencyKey: string;
      status: ConsultationPaymentStatus;
      consultationId: string;
    },
    payment: {
      id: string;
      status: PaymentStatus;
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
    },
  ): PaymentResponseDto {
    return {
      id: payment.id,
      idempotencyKey: cp.idempotencyKey,
      status: payment.status,
      consultationPaymentStatus: cp.status,
      consultationId: cp.consultationId,
      patientId: payment.consultation?.patientId ?? '',
      doctorId: payment.consultation?.doctorId ?? '',
      services: (payment.consultation?.services ?? []).map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        specialtyName: s.specialtyName,
        priceUsd: s.priceUsd.toString(),
      })),
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
