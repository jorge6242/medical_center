import { AsyncLocalStorage } from 'node:async_hooks';

import { Global, Module } from '@nestjs/common';

import { REQUEST_CONTEXT } from './request-context.interface';
import { RequestContextService } from './request-context.service';

import type { RequestContext } from './request-context.interface';

@Global()
@Module({
  providers: [
    {
      provide: REQUEST_CONTEXT,
      useValue: new AsyncLocalStorage<RequestContext>(),
    },
    RequestContextService,
  ],
  exports: [REQUEST_CONTEXT, RequestContextService],
})
export class RequestContextModule {}
