import { RECEIPT_EMAIL_QUEUE, RECEIPT_GENERATION_QUEUE } from '@centro-medico/shared/queues';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BullBoardController } from './bull-board.controller';
import { BullBoardService } from './bull-board.service';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: RECEIPT_GENERATION_QUEUE }),
    BullModule.registerQueue({ name: RECEIPT_EMAIL_QUEUE }),
  ],
  controllers: [QueuesController, BullBoardController],
  providers: [QueuesService, BullBoardService],
  exports: [BullModule],
})
export class QueuesModule {}
