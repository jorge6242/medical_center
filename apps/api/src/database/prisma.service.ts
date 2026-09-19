import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { buildAuditExtension } from './prisma-audit.extension';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestContextService } from '../common/context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly requestContext: RequestContextService,
  ) {
    const url = configService.getOrThrow<string>('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }

  async onModuleInit() {
    await this.$connect();
    Object.assign(
      this,
      this.$extends(buildAuditExtension(this, this.requestContext, this.auditLogService)),
    );
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
