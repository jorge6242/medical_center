import { Module } from '@nestjs/common';

import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
})
export class AppConfigModule {}
