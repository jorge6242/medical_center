import { Module } from '@nestjs/common';

import { PlatformSubscriptionPaymentsService } from './platform-subscription-payments.service';
import { PlatformSubscriptionsController } from './platform-subscriptions.controller';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';

@Module({
  controllers: [PlatformSubscriptionsController],
  providers: [
    PlatformSubscriptionsService,
    PlatformSubscriptionPaymentsService,
  ],
})
export class PlatformSubscriptionsModule {}
