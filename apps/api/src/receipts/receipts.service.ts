import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../database/prisma.service';

import type { ReceiptResponseDto } from './dto/receipt-response.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

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
              include: {
                consultation: {
                  include: {
                    services: true,
                    patient: true,
                    doctor: { include: { primarySpecialty: true } },
                  },
                },
              },
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
        this.extractPatient(receipt.payment),
        this.extractDoctorSpecialty(receipt.payment),
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
    const generatedBy = await this.prisma.user.findFirst({
      where: {
        id: generatedById,
        tenantId,
        isActive: true,
        tenant: { isActive: true },
      },
      select: { id: true },
    });
    if (!generatedBy) {
      throw new ForbiddenException('Usuario generador no pertenece al tenant');
    }

    const existing = await this.prisma.doctorReceipt.findFirst({
      where: { paymentId, payment: { tenantId } },
      include: {
        payment: {
          include: {
            details: true,
            item: {
              include: {
                consultation: {
                  include: {
                    services: true,
                    patient: true,
                    doctor: { include: { primarySpecialty: true } },
                  },
                },
              },
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
        this.extractPatient(existing.payment),
        this.extractDoctorSpecialty(existing.payment),
      );

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        item: {
          include: {
            consultation: {
              include: {
                services: true,
                patient: true,
                doctor: {
                  include: {
                    primarySpecialty: true,
                    bankAccounts: { where: { isDefault: true } },
                  },
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

    if (doctor.tenantId !== tenantId) {
      throw new ForbiddenException('Doctor no pertenece al tenant');
    }

    const defaultAccount = doctor.bankAccounts[0];

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }

    const currentYear = new Date().getFullYear();

    for (let attempt = 0; attempt < 5; attempt++) {
      const counter = await this.prisma.receiptCounter.upsert({
        where: { year_tenantId: { year: currentYear, tenantId } },
        update: { lastSeq: { increment: 1 } },
        create: { year: currentYear, tenantId, lastSeq: 1 },
      });

      const receiptNumber = `CM-${tenant.slug.toUpperCase()}-${currentYear}-${counter.lastSeq}`;

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
            splitPercentage: doctor.splitPercentage,
            totalConsultation: payment.totalServiceUsd,
            doctorShare: payment.doctorShareUsd,
            centerShare: payment.centerShareUsd,
          },
        });
        await this.auditLog.log(
          {
            action: 'CREATE',
            entity: 'DoctorReceipt',
            entityId: receipt.id,
            tenantId,
            userId: generatedById,
            newValues: { paymentId, receiptNumber: receipt.receiptNumber },
            changedFields: ['paymentId', 'receiptNumber'],
          },
          this.prisma,
        );

        return this.toResponse(
          receipt,
          payment.details ?? [],
          this.extractServices(payment),
          this.extractPatient(payment),
          this.extractDoctorSpecialty(payment),
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
                    include: {
                      consultation: {
                        include: {
                          services: true,
                          patient: true,
                          doctor: { include: { primarySpecialty: true } },
                        },
                      },
                    },
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
              this.extractPatient(existingReceipt.payment),
              this.extractDoctorSpecialty(existingReceipt.payment),
            );
          }

          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      'No se pudo generar un número de recibo único',
    );
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
    patient: {
      name: string;
      documentId?: string;
      phone?: string | null;
      birthDate?: Date | null;
    } | null = null,
    doctorSpecialtyName?: string | null,
  ): ReceiptResponseDto {
    return {
      id: r.id,
      receiptNumber: r.receiptNumber,
      paymentId: r.paymentId,
      patientName: patient?.name ?? '',
      patientDocumentId: patient?.documentId ?? null,
      patientPhone: patient?.phone ?? null,
      patientAge: this.calculateAge(patient?.birthDate),
      doctorName: r.doctorName,
      doctorPhone: r.doctorPhone ?? null,
      doctorDocument: r.doctorDocument,
      doctorSpecialtyName: doctorSpecialtyName ?? null,
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

  private calculateAge(birthDate?: Date | null): number | null {
    if (!birthDate) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
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

  private extractPatient(
    payment: {
      item?: {
        consultation?: {
          patient: {
            name: string;
            documentId: string;
            phone?: string | null;
            birthDate?: Date | null;
          } | null;
        } | null;
      } | null;
    } | null,
  ): {
    name: string;
    documentId?: string;
    phone?: string | null;
    birthDate?: Date | null;
  } | null {
    const patient = payment?.item?.consultation?.patient;
    if (!patient) return null;
    return {
      name: patient.name,
      documentId: patient.documentId,
      phone: patient.phone,
      birthDate: patient.birthDate,
    };
  }

  private extractDoctorSpecialty(
    payment: {
      item?: {
        consultation?: {
          doctor: {
            primarySpecialty?: { name: string } | null;
          } | null;
        } | null;
      } | null;
    } | null,
  ): string | null {
    return payment?.item?.consultation?.doctor?.primarySpecialty?.name ?? null;
  }
}
