import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

import { RECEIPT_GENERATION_QUEUE } from '@centro-medico/shared/queues';

import { appConfig } from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { ReceiptGenerationProcessor } from './worker/receipt-generation.processor';

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
  ],
  providers: [ReceiptGenerationProcessor],
})
export class WorkerModule {}
