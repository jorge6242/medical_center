import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  type SacsVerificationService,
  type SacsQueryResult,
} from './sacs-verification.service';
import { type AuditLogService } from '../audit-log/audit-log.service';
import { type LookupQueryDto } from '../common/dto/lookup-query.dto';
import {
  EntityLookupItemDto,
  type LookupResponseDto,
} from '../common/dto/lookup-response.dto';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  decodeNameCursor,
  encodeNameCursor,
} from '../common/utils/cursor-pagination.utils';
import { type PrismaService } from '../database/prisma.service';

import type {
  CreateDoctorDto,
  DoctorServiceDto,
} from './dto/create-doctor.dto';
import type { DoctorResponseDto } from './dto/doctor-response.dto';
import type { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import type { UpdateDoctorDto } from './dto/update-doctor.dto';
import type {
  AccountType,
  DocumentType,
  Prisma,
  VerificationStatus,
} from '@prisma/client';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sacsVerification: SacsVerificationService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async lookup(
    tenantId: string,
    query: LookupQueryDto,
  ): Promise<LookupResponseDto> {
    const cursor = decodeNameCursor(query.cursor);
    const search = query.q.trim();
    const where = {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { documentId: { contains: search, mode: 'insensitive' as const } },
      ],
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { name: { gt: cursor.name } },
                  { name: cursor.name, id: { gt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    };
    const doctors = await this.prisma.doctor.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      select: { id: true, name: true, documentType: true, documentId: true },
    });
    const hasNextPage = doctors.length > query.limit;
    const data = doctors.slice(0, query.limit).map((doctor) => {
      const item = new EntityLookupItemDto();
      Object.assign(item, doctor);
      return item;
    });
    const last = data.at(-1);

    return {
      data,
      hasNextPage,
      nextCursor:
        hasNextPage && last
          ? encodeNameCursor({ name: last.name, id: last.id })
          : null,
    };
  }

  async findAll(
    tenantId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<DoctorResponseDto>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              {
                documentId: { contains: search, mode: 'insensitive' as const },
              },
              {
                medicalLicenseNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                specialties: {
                  some: {
                    specialty: {
                      name: { contains: search, mode: 'insensitive' as const },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, doctors] = await this.prisma.$transaction([
      this.prisma.doctor.count({ where }),
      this.prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        include: {
          specialties: { include: { specialty: true } },
          bankAccounts: { where: { isActive: true } },
          doctorServices: { include: { specialty: true, service: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(
      doctors.map((d) => this.toResponse(d)),
      total,
      page,
      limit,
    );
  }

  async findOne(tenantId: string, id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        specialties: { include: { specialty: true } },
        bankAccounts: { where: { isActive: true } },
        doctorServices: { include: { specialty: true, service: true } },
      },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);
    return this.toResponse(doctor);
  }

  async create(
    tenantId: string,
    dto: CreateDoctorDto,
  ): Promise<DoctorResponseDto> {
    const existing = await this.prisma.doctor.findFirst({
      where: {
        tenantId,
        documentType: dto.documentType,
        documentId: dto.documentId,
        isActive: true,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Doctor con ${dto.documentType}-${dto.documentId} ya existe`,
      );
    }

    const validSpecialties = await this.prisma.specialty.findMany({
      where: { id: { in: dto.specialtyIds }, tenantId, isActive: true },
    });
    if (validSpecialties.length !== dto.specialtyIds.length) {
      throw new BadRequestException(
        'Una o más especialidades no son válidas para este tenant',
      );
    }
    await this.validateServiceSpecialties(tenantId, dto.services, this.prisma);

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

      await this.syncDoctorServices(tx, tenantId, created.id, dto.services);
      await this.auditLog?.log(
        {
          action: 'CREATE',
          entity: 'Doctor',
          entityId: created.id,
          newValues: {
            name: created.name,
            splitPercentage: created.splitPercentage,
          },
          changedFields: ['name', 'splitPercentage'],
        },
        tx,
      );

      return created;
    });

    // SACS searches by document ID, which is mandatory for every doctor.
    this.triggerVerification(doctor.id).catch(() => {
      // Fire-and-forget: failure does not affect doctor creation
    });

    return this.findOne(tenantId, doctor.id);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    const existing = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!existing) throw new NotFoundException(`Doctor ${id} no encontrado`);

    const documentType = dto.documentType ?? existing.documentType;
    const documentId = dto.documentId ?? existing.documentId;
    const isDocumentChanged =
      documentType !== existing.documentType ||
      documentId !== existing.documentId;
    if (isDocumentChanged) {
      const duplicate = await this.prisma.doctor.findFirst({
        where: { tenantId, documentType, documentId, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(
          `Doctor con ${documentType}-${documentId} ya existe`,
        );
      }
    }

    if (dto.specialtyIds) {
      const validSpecialties = await this.prisma.specialty.findMany({
        where: { id: { in: dto.specialtyIds }, tenantId, isActive: true },
        select: { id: true },
      });
      if (validSpecialties.length !== dto.specialtyIds.length) {
        throw new BadRequestException(
          'La especialidad informativa no es válida para este tenant',
        );
      }
    }

    if (dto.services) {
      await this.validateServiceSpecialties(
        tenantId,
        dto.services,
        this.prisma,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.doctor.updateMany({
        where: { id, tenantId },
        data: {
          documentType: dto.documentType,
          documentId: dto.documentId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          splitPercentage: dto.splitPercentage,
          medicalLicenseNumber: dto.medicalLicenseNumber,
        },
      });

      if (dto.specialtyIds) {
        await tx.doctorSpecialty.deleteMany({ where: { doctorId: id } });
        await tx.doctorSpecialty.create({
          data: {
            doctorId: id,
            specialtyId: dto.specialtyIds[0] as string,
            isPrimary: true,
          },
        });
      }

      if (dto.bankAccount) {
        const accountNumber = dto.bankAccount.accountNumber;
        const bankPhone = dto.bankAccount.phone;
        await tx.doctorBankAccount.updateMany({
          where: {
            doctorId: id,
            isActive: true,
            isDefault: true,
            doctor: { tenantId },
          },
          data: {
            bankName: dto.bankAccount.bankName,
            accountType: dto.bankAccount.accountType,
            accountNumber:
              accountNumber === undefined
                ? undefined
                : accountNumber?.trim() || null,
            documentId: dto.bankAccount.documentId,
            phone:
              bankPhone === undefined ? undefined : bankPhone?.trim() || null,
          },
        });
      }

      const updated = await tx.doctor.findFirstOrThrow({
        where: { id, tenantId },
      });
      await this.auditLog?.log(
        {
          action: 'UPDATE',
          entity: 'Doctor',
          entityId: updated.id,
          newValues: {
            name: updated.name,
            splitPercentage: updated.splitPercentage,
          },
          changedFields: Object.keys(dto),
        },
        tx,
      );

      if (dto.services) {
        await this.syncDoctorServices(tx, tenantId, id, dto.services);
      }
    });

    if (isDocumentChanged) {
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
    await this.auditLog?.log(
      {
        action: 'VERIFY',
        entity: 'Doctor',
        entityId: id,
        newValues: { outcome: 'completed' },
        changedFields: ['verificationStatus'],
      },
      this.prisma,
    );
    return this.findOne(tenantId, id);
  }

  async updateProfile(
    tenantId: string,
    id: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorResponseDto> {
    const existing = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!existing) throw new NotFoundException(`Doctor ${id} no encontrado`);

    await this.prisma.doctor.updateMany({
      where: { id, tenantId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
    const updated = await this.prisma.doctor.findFirstOrThrow({
      where: { id, tenantId },
    });
    await this.auditLog?.log(
      {
        action: 'UPDATE',
        entity: 'Doctor',
        entityId: updated.id,
        newValues: { name: updated.name, email: updated.email },
        changedFields: Object.keys(dto),
      },
      this.prisma,
    );

    return this.findOne(tenantId, id);
  }

  async getVerificationStatus(
    tenantId: string,
    id: string,
  ): Promise<{ status: string; licenseNumber: string | null }> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
      select: {
        verificationStatus: true,
        medicalLicenseNumber: true,
      },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);

    return {
      status: doctor.verificationStatus,
      licenseNumber: doctor.medicalLicenseNumber,
    };
  }

  async verifyDocument(
    documentType: string,
    documentId: string,
  ): Promise<SacsQueryResult> {
    return this.sacsVerification.verifyByDocument(documentType, documentId);
  }

  async getDoctorServices(
    tenantId: string,
    id: string,
  ): Promise<
    Array<{
      id: string;
      specialtyId: string;
      specialtyName: string;
      serviceId: string;
      serviceName: string;
      priceUsd: string;
    }>
  > {
    await this.assertExists(tenantId, id);
    const doctor = await this.prisma.doctor.findUniqueOrThrow({
      where: { id },
      include: {
        doctorServices: {
          where: { tenantId },
          include: { service: true, specialty: true },
          orderBy: [
            { specialty: { name: 'asc' } },
            { service: { name: 'asc' } },
          ],
        },
      },
    });
    return doctor.doctorServices.map((sp) => ({
      id: sp.id,
      specialtyId: sp.specialtyId,
      specialtyName: sp.specialty.name,
      serviceId: sp.serviceId,
      serviceName: sp.service.name,
      priceUsd: sp.priceUsd.toString(),
    }));
  }

  async findBySpecialty(tenantId: string, specialtyId: string) {
    const specialty = await this.prisma.specialty.findFirst({
      where: { id: specialtyId, tenantId, isActive: true },
      select: { id: true, name: true },
    });
    if (!specialty)
      throw new NotFoundException(`Especialidad ${specialtyId} no encontrada`);

    const doctors = await this.prisma.doctor.findMany({
      where: {
        tenantId,
        isActive: true,
        specialties: { some: { specialtyId } },
      },
      select: {
        id: true,
        name: true,
        doctorServices: {
          where: { tenantId, specialtyId },
          select: {
            id: true,
            service: { select: { name: true } },
            priceUsd: true,
          },
          orderBy: { service: { name: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    });
    return {
      specialty,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        services: doctor.doctorServices.map((service) => ({
          id: service.id,
          name: service.service.name,
          priceUsd: service.priceUsd.toString(),
        })),
      })),
    };
  }

  async deactivate(tenantId: string, id: string): Promise<DoctorResponseDto> {
    await this.assertExists(tenantId, id);
    await this.prisma.doctor.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
    const updated = await this.prisma.doctor.findFirstOrThrow({
      where: { id, tenantId },
    });
    await this.auditLog?.log(
      {
        action: 'DEACTIVATE',
        entity: 'Doctor',
        entityId: updated.id,
        newValues: { isActive: false },
        changedFields: ['isActive'],
      },
      this.prisma,
    );
    const doctor = await this.prisma.doctor.findFirstOrThrow({
      where: { id, tenantId },
      include: {
        specialties: { include: { specialty: true } },
        bankAccounts: true,
        doctorServices: {
          where: { tenantId },
          include: { specialty: true, service: true },
        },
      },
    });
    return this.toResponse(doctor);
  }

  private async triggerVerification(doctorId: string): Promise<void> {
    await this.sacsVerification.randomDelay();
    await this.sacsVerification.verifyDoctor(doctorId);
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const exists = await this.prisma.doctor.findFirst({
      where: { id, tenantId, isActive: true },
    });
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
      accountNumber: string | null;
      documentId: string;
      phone: string | null;
      isDefault: boolean;
    }>;
    doctorServices: Array<{
      id: string;
      specialtyId: string;
      serviceId: string;
      priceUsd: Prisma.Decimal;
      specialty: { name: string };
      service: { name: string };
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
      services: doctor.doctorServices.map((service) => ({
        id: service.id,
        specialtyId: service.specialtyId,
        specialtyName: service.specialty.name,
        serviceId: service.serviceId,
        serviceName: service.service.name,
        priceUsd: service.priceUsd.toString(),
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

  private async validateServiceSpecialties(
    tenantId: string,
    services: DoctorServiceDto[],
    prisma: PrismaService | Prisma.TransactionClient,
  ): Promise<void> {
    const specialtyIds = [
      ...new Set(services.map((service) => service.specialtyId)),
    ];
    const validSpecialties = await prisma.specialty.findMany({
      where: { tenantId, id: { in: specialtyIds }, isActive: true },
      select: { id: true },
    });
    if (validSpecialties.length !== specialtyIds.length) {
      throw new BadRequestException(
        'Una o más especialidades de servicio no son válidas para este tenant',
      );
    }
  }

  private async syncDoctorServices(
    tx: Prisma.TransactionClient,
    tenantId: string,
    doctorId: string,
    services: DoctorServiceDto[],
  ): Promise<void> {
    await tx.doctorService.deleteMany({ where: { tenantId, doctorId } });
    for (const serviceDto of services) {
      const service = await tx.service.upsert({
        where: {
          tenantId_name: { tenantId, name: serviceDto.serviceName },
        },
        update: { isActive: true },
        create: { tenantId, name: serviceDto.serviceName },
      });
      await this.auditLog?.log(
        {
          action: 'UPDATE',
          entity: 'Service',
          entityId: service.id,
          newValues: {
            name: service.name,
            doctorId,
            specialtyId: serviceDto.specialtyId,
          },
          changedFields: ['name', 'doctorId', 'specialtyId', 'priceUsd'],
        },
        tx,
      );
      await tx.doctorService.create({
        data: {
          tenantId,
          doctorId,
          specialtyId: serviceDto.specialtyId,
          serviceId: service.id,
          priceUsd: serviceDto.priceUsd,
        },
      });
    }
  }
}
