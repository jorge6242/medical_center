import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SacsVerificationService, type SacsQueryResult } from './sacs-verification.service';
import { PrismaService } from '../database/prisma.service';

import type { CreateDoctorDto } from './dto/create-doctor.dto';
import type { DoctorResponseDto } from './dto/doctor-response.dto';
import type { UpdateDoctorDto } from './dto/update-doctor.dto';
import type { AccountType, DocumentType, Prisma, VerificationStatus } from '@prisma/client';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sacsVerification: SacsVerificationService,
  ) {}

  async findAll(tenantId: string): Promise<DoctorResponseDto[]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { tenantId, isActive: true },
      include: {
        specialties: { include: { specialty: true } },
        bankAccounts: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
    return doctors.map((d) => this.toResponse(d));
  }

  async findOne(tenantId: string, id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        specialties: { include: { specialty: true } },
        bankAccounts: { where: { isActive: true } },
      },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);
    return this.toResponse(doctor);
  }

  async create(tenantId: string, dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const existing = await this.prisma.doctor.findFirst({
      where: { tenantId, documentType: dto.documentType, documentId: dto.documentId, isActive: true },
    });
    if (existing) {
      throw new ConflictException(`Doctor con ${dto.documentType}-${dto.documentId} ya existe`);
    }

    const validSpecialties = await this.prisma.specialty.findMany({
      where: { id: { in: dto.specialtyIds }, tenantId, isActive: true },
    });
    if (validSpecialties.length !== dto.specialtyIds.length) {
      throw new BadRequestException('Una o más especialidades no son válidas para este tenant');
    }

    const doctor = await this.prisma.$transaction(async (tx) => {
      const created = await tx.doctor.create({
        data: {
          tenantId,
          documentType: dto.documentType,
          documentId: dto.documentId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          splitPercentage: dto.splitPercentage,
          medicalLicenseNumber: dto.medicalLicenseNumber,
        },
      });

      for (let i = 0; i < dto.specialtyIds.length; i++) {
        await tx.doctorSpecialty.create({
          data: {
            doctorId: created.id,
            specialtyId: dto.specialtyIds[i] as string,
            isPrimary: i === 0,
          },
        });
      }

      await tx.doctorBankAccount.create({
        data: {
          doctorId: created.id,
          bankName: dto.bankAccount.bankName,
          accountType: dto.bankAccount.accountType,
          accountNumber: dto.bankAccount.accountNumber,
          documentId: dto.bankAccount.documentId,
          phone: dto.bankAccount.phone,
          isDefault: true,
        },
      });

      return created;
    });

    // Async SACS verification — non-blocking
    if (dto.medicalLicenseNumber) {
      this.triggerVerification(doctor.id).catch(() => {
        // Fire-and-forget: failure does not affect doctor creation
      });
    }

    return this.findOne(tenantId, doctor.id);
  }

  async update(tenantId: string, id: string, dto: UpdateDoctorDto): Promise<DoctorResponseDto> {
    const existing = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!existing) throw new NotFoundException(`Doctor ${id} no encontrado`);

    const shouldReverify =
      dto.medicalLicenseNumber !== undefined &&
      dto.medicalLicenseNumber !== existing.medicalLicenseNumber;

    await this.prisma.doctor.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        splitPercentage: dto.splitPercentage,
        medicalLicenseNumber: dto.medicalLicenseNumber,
      },
    });

    if (shouldReverify && dto.medicalLicenseNumber) {
      this.triggerVerification(id).catch(() => {});
    }

    return this.findOne(tenantId, id);
  }

  async verify(tenantId: string, id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);

    await this.sacsVerification.verifyDoctor(id);
    return this.findOne(tenantId, id);
  }

  async verifyDocument(documentType: string, documentId: string): Promise<SacsQueryResult> {
    return this.sacsVerification.verifyByDocument(documentType, documentId);
  }

  async getServicePrices(
    tenantId: string,
    id: string,
  ): Promise<Array<{ id: string; specialtyId: string; specialtyName: string; serviceId: string; serviceName: string; priceUsd: string }>> {
    await this.assertExists(tenantId, id);
    const doctor = await this.prisma.doctor.findUniqueOrThrow({
      where: { id },
      include: { specialties: true },
    });
    const specialtyIds = doctor.specialties.map((ds) => ds.specialtyId);
    const prices = await this.prisma.servicePrice.findMany({
      where: { specialtyId: { in: specialtyIds }, isActive: true },
      include: { service: true, specialty: true },
      orderBy: [{ specialty: { name: 'asc' } }, { service: { name: 'asc' } }],
    });
    return prices.map((sp) => ({
      id: sp.id,
      specialtyId: sp.specialtyId,
      specialtyName: sp.specialty.name,
      serviceId: sp.serviceId,
      serviceName: sp.service.name,
      priceUsd: sp.priceUsd.toString(),
    }));
  }

  async deactivate(tenantId: string, id: string): Promise<DoctorResponseDto> {
    await this.assertExists(tenantId, id);
    await this.prisma.doctor.update({ where: { id }, data: { isActive: false } });
    const doctor = await this.prisma.doctor.findUniqueOrThrow({
      where: { id },
      include: { specialties: { include: { specialty: true } }, bankAccounts: true },
    });
    return this.toResponse(doctor);
  }

  private async triggerVerification(doctorId: string): Promise<void> {
    await this.sacsVerification.randomDelay();
    await this.sacsVerification.verifyDoctor(doctorId);
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const exists = await this.prisma.doctor.findFirst({ where: { id, tenantId, isActive: true } });
    if (!exists) throw new NotFoundException(`Doctor ${id} no encontrado`);
  }

  private toResponse(doctor: {
    id: string;
    documentType: DocumentType;
    documentId: string;
    name: string;
    email: string | null;
    phone: string | null;
    splitPercentage: Prisma.Decimal;
    isActive: boolean;
    medicalLicenseNumber: string | null;
    verificationStatus: string;
    verifiedAt: Date | null;
    lastVerifiedAt: Date | null;
    specialties: Array<{
      specialtyId: string;
      isPrimary: boolean;
      specialty: { name: string };
    }>;
    bankAccounts: Array<{
      id: string;
      bankName: string;
      accountType: AccountType;
      accountNumber: string;
      documentId: string;
      phone: string | null;
      isDefault: boolean;
    }>;
  }): DoctorResponseDto {
    return {
      id: doctor.id,
      documentType: doctor.documentType,
      documentId: doctor.documentId,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      splitPercentage: doctor.splitPercentage.toString(),
      isActive: doctor.isActive,
      medicalLicenseNumber: doctor.medicalLicenseNumber,
      verificationStatus: doctor.verificationStatus as VerificationStatus,
      verifiedAt: doctor.verifiedAt?.toISOString() ?? null,
      lastVerifiedAt: doctor.lastVerifiedAt?.toISOString() ?? null,
      specialties: doctor.specialties.map((ds) => ({
        specialtyId: ds.specialtyId,
        specialtyName: ds.specialty.name,
        isPrimary: ds.isPrimary,
      })),
      bankAccounts: doctor.bankAccounts.map((ba) => ({
        id: ba.id,
        bankName: ba.bankName,
        accountType: ba.accountType,
        accountNumber: ba.accountNumber,
        documentId: ba.documentId,
        phone: ba.phone,
        isDefault: ba.isDefault,
      })),
    };
  }
}
