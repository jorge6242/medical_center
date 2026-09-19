import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
}

@Injectable()
export class AuditLogService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaClient;

  constructor(configService: ConfigService) {
    const url = configService.getOrThrow<string>('DATABASE_URL');
    this.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: (entry.oldValues ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
        newValues: (entry.newValues ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
        changedFields: entry.changedFields ?? [],
      },
    });
  }
}
