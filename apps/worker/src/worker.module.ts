import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

import { RECEIPT_GENERATION_QUEUE } from '@centro-medico/shared/queues';

import { appConfig } from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { PrismaService } from './database/prisma.service';
import { ReceiptGenerationProcessor } from './worker/receipt-generation.processor';
import { ReportsExportProcessor } from './worker/reports-export.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env['NODE_ENV']}`, '.env'],
      load: [appConfig],
      validationSchema: envValidationSchema,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: RECEIPT_GENERATION_QUEUE }),
    BullModule.registerQueue({ name: 'reports-export' }),
  ],
  providers: [PrismaService, ReceiptGenerationProcessor, ReportsExportProcessor],
})
export class WorkerModule {}
