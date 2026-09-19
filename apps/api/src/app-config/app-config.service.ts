import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  async getInitConfig(tenantId: string) {
    const [tenant, igtfConfig, exchangeRate] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.systemConfig.findFirst({
        where: { tenantId, key: 'igtf_rate' },
      }),
      this.exchangeRates.findLatest(tenantId),
    ]);

    return {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
      },
      systemConfig: {
        igtfRate: parseFloat(igtfConfig?.value ?? '0'),
      },
      exchangeRate,
    };
  }
}
