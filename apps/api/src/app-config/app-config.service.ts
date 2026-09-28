import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import {
  RailwayBucketService,
  type UploadedLogo,
} from '../railway-bucket/railway-bucket.service';

import type { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly railwayBucket: RailwayBucketService,
  ) {}

  async getInitConfig(tenantId: string) {
    const [tenant, igtfConfig, exchangeRate, reminderConfigs] =
      await Promise.all([
        this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
        this.prisma.systemConfig.findFirst({
          where: { tenantId, key: 'igtf_rate' },
        }),
        this.exchangeRates.findLatest(tenantId),
        this.prisma.reminderConfig.findMany({ where: { tenantId } }),
      ]);

    const logoUrl = await this.railwayBucket.resolveLogoUrl(
      tenant.logoObjectKey,
      tenant.logoUrl,
    );

    return {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        logoUrl,
      },
      systemConfig: {
        igtfRate: parseFloat(igtfConfig?.value ?? '0'),
      },
      exchangeRate,
      reminderConfigs,
    };
  }

  async updateTenantSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<{ email: string | null }> {
    const result = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { email: dto.email },
      select: { email: true },
    });

    if (dto.reminderConfigs && dto.reminderConfigs.length > 0) {
      await this.updateReminderConfigs(tenantId, dto.reminderConfigs);
    }

    return result;
  }

  private async updateReminderConfigs(
    tenantId: string,
    configs: UpdateTenantSettingsDto['reminderConfigs'],
  ): Promise<void> {
    if (!configs || configs.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      configs.map((config) =>
        this.prisma.reminderConfig.upsert({
          where: { tenantId_type: { tenantId, type: config.type } },
          update: {
            isActive: config.isActive,
            sendToPatient: config.sendToPatient,
            sendToDoctor: config.sendToDoctor,
            sendToAdmin: config.sendToAdmin,
          },
          create: {
            tenantId,
            type: config.type,
            isActive: config.isActive,
            sendToPatient: config.sendToPatient,
            sendToDoctor: config.sendToDoctor,
            sendToAdmin: config.sendToAdmin,
            hoursBefore: config.type === 'APPOINTMENT' ? 24 : null,
            daysBefore: config.type === 'BIRTHDAY' ? 0 : null,
          },
        }),
      ),
    );
  }

  async replaceLogo(
    tenantId: string,
    file: UploadedLogo,
  ): Promise<{ logoUrl: string | null }> {
    const tenant = await this.prisma.tenant.findFirstOrThrow({
      where: { id: tenantId, isActive: true },
      select: { logoObjectKey: true, slug: true },
    });
    const logoObjectKey = await this.railwayBucket.uploadLogo(
      tenant.slug,
      file,
    );

    await this.persistLogoObjectKey(tenantId, logoObjectKey);
    await this.removePreviousLogo(tenant.logoObjectKey);

    return {
      logoUrl: await this.railwayBucket.resolveLogoUrl(logoObjectKey, null),
    };
  }

  private async persistLogoObjectKey(
    tenantId: string,
    logoObjectKey: string,
  ): Promise<void> {
    try {
      await this.prisma.tenant.updateMany({
        where: { id: tenantId },
        data: { logoObjectKey },
      });
    } catch (error) {
      await this.railwayBucket.deleteObject(logoObjectKey);
      throw error;
    }
  }

  private async removePreviousLogo(
    logoObjectKey: string | null,
  ): Promise<void> {
    if (!logoObjectKey) return;

    try {
      await this.railwayBucket.deleteObject(logoObjectKey);
    } catch (error) {
      this.logger.warn(
        `No se pudo eliminar el logo previo ${logoObjectKey}: ${String(error)}`,
      );
    }
  }
}
