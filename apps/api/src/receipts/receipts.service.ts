import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

import type { ReceiptResponseDto } from './dto/receipt-response.dto';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPayment(
    tenantId: string,
    paymentId: string,
    generatedById?: string,
  ): Promise<ReceiptResponseDto> {
    const receipt = await this.prisma.doctorReceipt.findFirst({
      where: { paymentId, payment: { tenantId } },
      include: {
        payment: {
          include: {
            details: true,
            item: {
              include: { consultation: { include: { services: true } } },
            },
          },
        },
      },
    });
    if (receipt)
      return this.toResponse(
        receipt,
        receipt.payment?.details ?? [],
        this.extractServices(receipt.payment),
      );

    if (!generatedById)
      throw new NotFoundException(
        `Recibo para pago ${paymentId} no encontrado`,
      );

    return this.createForPayment(tenantId, paymentId, generatedById);
  }

  async createForPayment(
    tenantId: string,
    paymentId: string,
    generatedById: string,
  ): Promise<ReceiptResponseDto> {
    const existing = await this.prisma.doctorReceipt.findFirst({
      where: { paymentId, payment: { tenantId } },
      include: {
        payment: {
          include: {
            details: true,
            item: {
              include: { consultation: { include: { services: true } } },
            },
          },
        },
      },
    });
    if (existing)
      return this.toResponse(
        existing,
        existing.payment?.details ?? [],
        this.extractServices(existing.payment),
      );

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        item: {
          include: {
            consultation: {
              include: {
                services: true,
                doctor: {
                  include: { bankAccounts: { where: { isDefault: true } } },
                },
              },
            },
          },
        },
        details: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    }

    if (payment.item?.itemType !== 'CONSULTATION') {
      throw new BadRequestException(
        'Los recibos de doctor solo aplican a pagos de consulta médica',
      );
    }

    const doctor = payment.item.consultation?.doctor;
    if (!doctor) {
      throw new NotFoundException(
        `Doctor no encontrado para el pago ${paymentId}`,
      );
    }

    const defaultAccount = doctor.bankAccounts[0];

    const currentYear = new Date().getFullYear();
    const counter = await this.prisma.receiptCounter.upsert({
      where: { year_tenantId: { year: currentYear, tenantId } },
      update: { lastSeq: { increment: 1 } },
      create: { year: currentYear, tenantId, lastSeq: 1 },
    });

    const receiptNumber = `CM-${currentYear}-${counter.lastSeq}`;

    try {
      const receipt = await this.prisma.doctorReceipt.create({
        data: {
          receiptNumber,
          paymentId,
          generatedById,
          doctorName: doctor.name,
          doctorPhone: doctor.phone ?? '',
          doctorDocument: `${doctor.documentType}-${doctor.documentId}`,
          bankName: defaultAccount?.bankName ?? '',
          accountNumber: defaultAccount?.accountNumber ?? '',
          splitPercentage: doctor.splitPercentage, // Use doctor's split percentage directly
          totalConsultation: payment.totalServiceUsd,
          doctorShare: payment.doctorShareUsd,
          centerShare: payment.centerShareUsd,
        },
      });

      return this.toResponse(
        receipt,
        payment.details ?? [],
        this.extractServices(payment),
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingReceipt = await this.prisma.doctorReceipt.findFirst({
          where: { paymentId, payment: { tenantId } },
          include: {
            payment: {
              include: {
                details: true,
                item: {
                  include: { consultation: { include: { services: true } } },
                },
              },
            },
          },
        });

        if (existingReceipt) {
          return this.toResponse(
            existingReceipt,
            existingReceipt.payment?.details ?? [],
            this.extractServices(existingReceipt.payment),
          );
        }
      }

      throw error;
    }
  }

  private toResponse(
    r: {
      id: string;
      receiptNumber: string;
      paymentId: string;
      doctorName: string;
      doctorPhone?: string | null;
      doctorDocument: string;
      bankName: string;
      accountNumber: string;
      splitPercentage: Prisma.Decimal;
      totalConsultation: Prisma.Decimal;
      doctorShare: Prisma.Decimal;
      centerShare: Prisma.Decimal;
      status: string;
      generatedAt: Date;
    },
    details: Array<{
      paymentMethod: string;
      currency: string;
      amount: Prisma.Decimal;
      referenceNumber: string | null;
      appliedIgtfAmount: Prisma.Decimal;
    }> = [],
    services: Array<{
      serviceId: string;
      serviceName: string;
      specialtyName: string;
      priceUsd: Prisma.Decimal;
    }> = [],
  ): ReceiptResponseDto {
    return {
      id: r.id,
      receiptNumber: r.receiptNumber,
      paymentId: r.paymentId,
      doctorName: r.doctorName,
      doctorPhone: r.doctorPhone ?? null,
      doctorDocument: r.doctorDocument,
      bankName: r.bankName,
      accountNumber: r.accountNumber,
      splitPercentage: r.splitPercentage.toString(),
      totalConsultation: r.totalConsultation.toString(),
      doctorShare: r.doctorShare.toString(),
      centerShare: r.centerShare.toString(),
      status: r.status,
      generatedAt: r.generatedAt,
      services: services.map((service) => ({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        specialtyName: service.specialtyName,
        priceUsd: service.priceUsd.toString(),
      })),
      details: details.map((d) => ({
        paymentMethod: d.paymentMethod,
        currency: d.currency,
        amount: d.amount.toString(),
        referenceNumber: d.referenceNumber,
        appliedIgtfAmount: d.appliedIgtfAmount.toString(),
      })),
    };
  }

  private extractServices(
    payment: {
      item?: {
        consultation?: {
          services: Array<{
            serviceId: string;
            serviceName: string;
            specialtyName: string;
            priceUsd: Prisma.Decimal;
          }>;
        } | null;
      } | null;
    } | null,
  ): Array<{
    serviceId: string;
    serviceName: string;
    specialtyName: string;
    priceUsd: Prisma.Decimal;
  }> {
    return payment?.item?.consultation?.services ?? [];
  }
}
