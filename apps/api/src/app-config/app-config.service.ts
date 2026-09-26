import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import {
  RailwayBucketService,
  type UploadedLogo,
} from '../railway-bucket/railway-bucket.service';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly railwayBucket: RailwayBucketService,
  ) {}

  async getInitConfig(tenantId: string) {
    const [tenant, igtfConfig, exchangeRate] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.systemConfig.findFirst({
        where: { tenantId, key: 'igtf_rate' },
      }),
      this.exchangeRates.findLatest(tenantId),
    ]);

    const logoUrl = await this.railwayBucket.resolveLogoUrl(
      tenant.logoObjectKey,
      tenant.logoUrl,
    );

    return {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        logoUrl,
      },
      systemConfig: {
        igtfRate: parseFloat(igtfConfig?.value ?? '0'),
      },
      exchangeRate,
    };
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
